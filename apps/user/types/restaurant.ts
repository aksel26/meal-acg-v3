/**
 * Restaurant-related types for user app
 */

/**
 * Popular restaurant data from aggregated meal logs
 */
export interface PopularRestaurant {
  /** Normalized restaurant name */
  name: string;
  /** Total visit count across all meals */
  count: number;
}
