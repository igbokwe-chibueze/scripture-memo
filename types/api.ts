/**
 * Standard serializable result returned by Scripture Memo Server Actions.
 *
 * The discriminant lets client components narrow success and failure without
 * exceptions or unsafe casts. Field errors remain optional because actions
 * without form input can still return a useful general failure message.
 */
export type ActionResult<T = undefined> =
  | { success: true; message: string; data?: T }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
