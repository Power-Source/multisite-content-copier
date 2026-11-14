<?php

class Multisite_Content_Copier_Copier_Model {

	static $instance;


	/**
	 * Return an instance of the class
	 * 
	 * @since 1.0.0
	 * 
	 * @return Object
	 */
	public static function get_instance() {
		if ( self::$instance === null )
			self::$instance = new self();
            
        return self::$instance;
	}
 
	/**
	 * Set the tables names, charset, collate and creates the schema if needed.
	 * This way, the schema will be created when the model is created for first time.
	 */
	protected function __construct() {}

	public function get_post_meta( $post_id ) {
		global $wpdb;

		$query = $wpdb->prepare( "SELECT * FROM $wpdb->postmeta WHERE post_id = %d", $post_id );

		return $wpdb->get_results( $query );

	}

	public function get_attachment_data( $filename ) {
		global $wpdb;

		$query = $wpdb->prepare( "SELECT post_id, meta_value FROM $wpdb->postmeta WHERE meta_key = '_wp_attached_file' AND meta_value LIKE %s", '%' . $filename . '%' );

		return $wpdb->get_row( $query );
	}

	public function get_copied_post_id( $source_blog_id, $source_post_id ) {
		global $wpdb;

		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT p.ID FROM $wpdb->posts p
				INNER JOIN $wpdb->postmeta pm ON p.ID = pm.post_id
				WHERE pm.meta_key = '_mcc_source' AND pm.meta_value = %s
				ORDER BY p.ID ASC LIMIT 1",
				$source_blog_id . ':' . $source_post_id
			)
		);
	}

}