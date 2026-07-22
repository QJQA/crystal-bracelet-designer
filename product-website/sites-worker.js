export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const routes = {
      "/": "/index.html",
      "/mobile": "/store-saas/index.html",
      "/admin": "/store-saas/admin.html",
    };

    if (routes[url.pathname]) {
      url.pathname = routes[url.pathname];
      return env.ASSETS.fetch(new Request(url, request));
    }

    return env.ASSETS.fetch(request);
  },
};
