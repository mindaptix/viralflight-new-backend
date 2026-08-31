const renderOAuthPage = ({ title, message, isSuccess }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Viral Flight</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      color: #1a1a2e;
      margin-bottom: 12px;
    }
    p {
      font-size: 16px;
      color: #555;
      line-height: 1.5;
    }
    .brand {
      margin-top: 24px;
      font-size: 13px;
      color: #aaa;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? "✅" : "❌"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="brand">Viral Flight</p>
  </div>
</body>
</html>`;

const sendOAuthHtml = (res, statusCode, { title, message, isSuccess }) => {
  res.status(statusCode).type("html").send(renderOAuthPage({ title, message, isSuccess }));
};

export { renderOAuthPage, sendOAuthHtml };
