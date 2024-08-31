if (process.env.NODE_ENV === "development") {
  const { createProxyMiddleware } = require("http-proxy-middleware");

  module.exports = function (app) {
    app.use(
      "/api",
      createProxyMiddleware({
        target: "https://python-script-takehome-urxqnrtkla-uc.a.run.app",
        changeOrigin: true,
        pathRewrite: {
          "^/api": "",
        },
      })
    );
  };
}
