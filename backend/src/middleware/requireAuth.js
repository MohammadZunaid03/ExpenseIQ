import { verifyAccessToken } from "../utils/tokens.js";

export function requireAuth(request, response, next) {
  const authorization = request.get("authorization") || "";
  const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extraParts.length > 0) {
    return response.status(401).json({
      success: false,
      message: "A valid bearer token is required.",
    });
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload.sub) {
      return response.status(401).json({
        success: false,
        message: "The access token is invalid.",
      });
    }

    request.user = { id: payload.sub };
    return next();
  } catch {
    return response.status(401).json({
      success: false,
      message: "The access token is invalid or has expired.",
    });
  }
}
