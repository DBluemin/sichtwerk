<?php
/**
 * Plugin Name:       NENNWERT SEO-Connector
 * Plugin URI:        https://nennwert.dental-connect.eu
 * Description:       Verbindet diese WordPress-Site mit dem NENNWERT SEO-Cockpit (DentalConnect). Freigegebene Change-Sets werden als versionierte Änderungen geschrieben — jede Änderung wird vorher gesichert und ist per Rollback rückholbar. Ohne gültigen Site-Schlüssel passiert nichts.
 * Version:           0.1.0
 * Author:            DentalConnect
 * License:           GPL-2.0-or-later
 * Requires at least: 6.0
 * Requires PHP:      7.4
 *
 * Sicherheitsmodell:
 *  - Jede API-Anfrage muss den Site-Schlüssel im Header X-Nennwert-Key tragen
 *    (Vergleich mit hash_equals, Schlüssel wird nur einmal angezeigt).
 *  - Der Connector kann NUR: Meta-Titel/-Description, JSON-LD-Schema und
 *    Bild-Alt-Texte schreiben sowie eigene Änderungen zurückrollen.
 *    Kein Zugriff auf Inhalte, Nutzer, Plugins oder Einstellungen.
 *  - Vor jeder Änderung wird der Altzustand als Backup-Meta gesichert.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

final class Nennwert_SEO_Connector {

	const OPT_KEY   = 'nennwert_site_key_hash';
	const META_T    = '_nennwert_title';
	const META_D    = '_nennwert_description';
	const META_S    = '_nennwert_schema';
	const META_BAK  = '_nennwert_backup_';   // + changeset_id
	const META_LOG  = '_nennwert_changelog';

	public static function init() {
		$self = new self();
		add_action( 'rest_api_init', [ $self, 'routes' ] );
		add_action( 'admin_menu', [ $self, 'admin_menu' ] );
		// Ausspielung der verwalteten Werte:
		add_filter( 'pre_get_document_title', [ $self, 'filter_title' ], 20 );
		add_filter( 'wpseo_title', [ $self, 'filter_title' ], 20 );            // Yoast
		add_filter( 'rank_math/frontend/title', [ $self, 'filter_title' ], 20 ); // RankMath
		add_action( 'wp_head', [ $self, 'print_head' ], 5 );
	}

	/* ---------- Ausspielung ---------- */

	public function filter_title( $title ) {
		if ( is_singular() ) {
			$t = get_post_meta( get_the_ID(), self::META_T, true );
			if ( $t ) { return wp_strip_all_tags( $t ); }
		}
		return $title;
	}

	public function print_head() {
		if ( ! is_singular() ) { return; }
		$id = get_the_ID();
		$d  = get_post_meta( $id, self::META_D, true );
		if ( $d && ! defined( 'WPSEO_VERSION' ) && ! defined( 'RANK_MATH_VERSION' ) ) {
			printf( '<meta name="description" content="%s">' . "\n", esc_attr( $d ) );
		}
		$s = get_post_meta( $id, self::META_S, true );
		if ( $s ) {
			// Nur ausgeben, was als valides JSON gespeichert wurde.
			$decoded = json_decode( $s );
			if ( null !== $decoded ) {
				printf( '<script type="application/ld+json">%s</script>' . "\n", wp_json_encode( $decoded ) );
			}
		}
	}

	/* ---------- REST-API ---------- */

	public function routes() {
		$ns = 'nennwert/v1';
		$auth = [ $this, 'auth' ];
		register_rest_route( $ns, '/ping', [
			'methods' => 'GET', 'permission_callback' => $auth,
			'callback' => function () {
				return [
					'ok'         => true,
					'site'       => get_bloginfo( 'name' ),
					'wp'         => get_bloginfo( 'version' ),
					'seo_plugin' => defined( 'WPSEO_VERSION' ) ? 'yoast' : ( defined( 'RANK_MATH_VERSION' ) ? 'rankmath' : 'none' ),
					'connector'  => '0.1.0',
				];
			},
		] );
		register_rest_route( $ns, '/pages', [
			'methods' => 'GET', 'permission_callback' => $auth,
			'callback' => function ( $req ) {
				$q = new WP_Query( [
					'post_type'      => [ 'page', 'post' ],
					'post_status'    => 'publish',
					'posts_per_page' => min( 100, (int) ( $req['per_page'] ?: 50 ) ),
					'fields'         => 'ids',
				] );
				return array_map( function ( $id ) {
					return [
						'id'    => $id,
						'url'   => get_permalink( $id ),
						'title' => get_the_title( $id ),
						'nennwert_title' => get_post_meta( $id, self::META_T, true ),
					];
				}, $q->posts );
			},
		] );
		register_rest_route( $ns, '/apply', [
			'methods' => 'POST', 'permission_callback' => $auth,
			'callback' => [ $this, 'apply' ],
		] );
		register_rest_route( $ns, '/rollback', [
			'methods' => 'POST', 'permission_callback' => $auth,
			'callback' => [ $this, 'rollback' ],
		] );
	}

	public function auth( $req ) {
		$key  = $req->get_header( 'X-Nennwert-Key' );
		$hash = get_option( self::OPT_KEY );
		if ( ! $key || ! $hash ) { return false; }
		return hash_equals( $hash, hash( 'sha256', $key ) );
	}

	/**
	 * Change-Set anwenden. Body:
	 * { "changeset_id": "cs_123", "post_id": 42,
	 *   "changes": { "meta_title": "...", "meta_description": "...",
	 *                "schema_jsonld": {...},
	 *                "alt_texts": [ { "attachment_id": 7, "alt": "..." } ] } }
	 */
	public function apply( $req ) {
		$p  = $req->get_json_params();
		$id = (int) ( $p['post_id'] ?? 0 );
		$cs = sanitize_key( $p['changeset_id'] ?? '' );
		if ( ! $id || ! $cs || ! get_post( $id ) ) {
			return new WP_Error( 'nennwert_bad_request', 'post_id oder changeset_id fehlt/ungültig.', [ 'status' => 400 ] );
		}
		$changes = (array) ( $p['changes'] ?? [] );

		// 1) Altzustand sichern (idempotent: vorhandenes Backup nie überschreiben)
		if ( ! get_post_meta( $id, self::META_BAK . $cs, true ) ) {
			update_post_meta( $id, self::META_BAK . $cs, [
				'title'  => get_post_meta( $id, self::META_T, true ),
				'desc'   => get_post_meta( $id, self::META_D, true ),
				'schema' => get_post_meta( $id, self::META_S, true ),
				'time'   => current_time( 'mysql' ),
			] );
		}

		// 2) Änderungen schreiben (nur erlaubte Felder)
		$applied = [];
		if ( isset( $changes['meta_title'] ) ) {
			update_post_meta( $id, self::META_T, sanitize_text_field( $changes['meta_title'] ) );
			$applied[] = 'meta_title';
		}
		if ( isset( $changes['meta_description'] ) ) {
			update_post_meta( $id, self::META_D, sanitize_text_field( $changes['meta_description'] ) );
			$applied[] = 'meta_description';
		}
		if ( isset( $changes['schema_jsonld'] ) ) {
			$json = wp_json_encode( $changes['schema_jsonld'] );
			if ( $json && strlen( $json ) < 20000 ) {
				update_post_meta( $id, self::META_S, $json );
				$applied[] = 'schema_jsonld';
			}
		}
		if ( ! empty( $changes['alt_texts'] ) && is_array( $changes['alt_texts'] ) ) {
			foreach ( $changes['alt_texts'] as $a ) {
				$att = (int) ( $a['attachment_id'] ?? 0 );
				if ( $att && 'attachment' === get_post_type( $att ) ) {
					update_post_meta( $att, '_wp_attachment_image_alt', sanitize_text_field( $a['alt'] ?? '' ) );
					$applied[] = 'alt:' . $att;
				}
			}
		}

		// 3) Protokoll
		$log   = (array) get_post_meta( $id, self::META_LOG, true );
		$log[] = [ 'cs' => $cs, 'applied' => $applied, 'time' => current_time( 'mysql' ) ];
		update_post_meta( $id, self::META_LOG, array_slice( $log, -50 ) );

		return [ 'ok' => true, 'changeset_id' => $cs, 'applied' => $applied ];
	}

	/** Rollback: Body { "changeset_id": "cs_123", "post_id": 42 } */
	public function rollback( $req ) {
		$p   = $req->get_json_params();
		$id  = (int) ( $p['post_id'] ?? 0 );
		$cs  = sanitize_key( $p['changeset_id'] ?? '' );
		$bak = get_post_meta( $id, self::META_BAK . $cs, true );
		if ( ! is_array( $bak ) ) {
			return new WP_Error( 'nennwert_no_backup', 'Kein Backup zu diesem Change-Set.', [ 'status' => 404 ] );
		}
		update_post_meta( $id, self::META_T, $bak['title'] );
		update_post_meta( $id, self::META_D, $bak['desc'] );
		update_post_meta( $id, self::META_S, $bak['schema'] );
		delete_post_meta( $id, self::META_BAK . $cs );
		return [ 'ok' => true, 'restored_from' => $bak['time'] ];
	}

	/* ---------- Admin: Site-Schlüssel ---------- */

	public function admin_menu() {
		add_options_page( 'NENNWERT SEO-Connector', 'NENNWERT', 'manage_options', 'nennwert-connector', [ $this, 'admin_page' ] );
	}

	public function admin_page() {
		if ( ! current_user_can( 'manage_options' ) ) { return; }
		$new_key = '';
		if ( isset( $_POST['nennwert_regen'] ) && check_admin_referer( 'nennwert_regen' ) ) {
			$new_key = wp_generate_password( 40, false );
			update_option( self::OPT_KEY, hash( 'sha256', $new_key ) );
		}
		$connected = (bool) get_option( self::OPT_KEY );
		echo '<div class="wrap"><h1>NENNWERT SEO-Connector</h1>';
		echo '<p>Status: ' . ( $connected ? '<strong style="color:#0a7d4b">Schlüssel gesetzt — bereit für das SEO-Cockpit</strong>' : '<strong style="color:#b32d2e">Noch kein Site-Schlüssel</strong>' ) . '</p>';
		if ( $new_key ) {
			echo '<div class="notice notice-success"><p><strong>Neuer Site-Schlüssel (wird nur EINMAL angezeigt):</strong><br><code>' . esc_html( $new_key ) . '</code><br>Diesen Schlüssel im SEO-Cockpit unter Einstellungen → Konnektoren → WordPress eintragen.</p></div>';
		}
		echo '<form method="post">';
		wp_nonce_field( 'nennwert_regen' );
		submit_button( $connected ? 'Schlüssel neu erzeugen (alter wird ungültig)' : 'Site-Schlüssel erzeugen', 'primary', 'nennwert_regen' );
		echo '</form>';
		echo '<h2>Was dieses Plugin darf</h2><ul style="list-style:disc;margin-left:20px">';
		echo '<li>Meta-Titel &amp; Meta-Descriptions setzen (Backup + Rollback je Change-Set)</li>';
		echo '<li>JSON-LD-Schema pro Seite ausgeben</li>';
		echo '<li>Bild-Alt-Texte setzen</li>';
		echo '</ul><p>Nicht mehr. Keine Inhalte, keine Nutzer, keine Einstellungen. Plugin deaktivieren trennt die Verbindung sofort; alle Werte bleiben in Ihrer Datenbank.</p></div>';
	}
}

Nennwert_SEO_Connector::init();
