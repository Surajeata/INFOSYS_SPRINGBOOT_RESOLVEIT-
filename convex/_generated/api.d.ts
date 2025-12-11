
import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as autoEscalation from "../autoEscalation.js";
import type * as complaints from "../complaints.js";
import type * as crons from "../crons.js";
import type * as emailActions from "../emailActions.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as router from "../router.js";
import type * as users from "../users.js";
declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  auth: typeof auth;
  autoEscalation: typeof autoEscalation;
  complaints: typeof complaints;
  crons: typeof crons;
  emailActions: typeof emailActions;
  http: typeof http;
  notifications: typeof notifications;
  router: typeof router;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
