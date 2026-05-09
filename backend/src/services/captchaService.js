const https = require('https');
const querystring = require('querystring');

async function verifyCaptcha(token) {
  if (process.env.NODE_ENV !== 'production' && token === 'test') return true;

  return new Promise((resolve) => {
    const body = querystring.stringify({
      secret: process.env.HCAPTCHA_SECRET,
      response: token,
    });

    const options = {
      hostname: 'hcaptcha.com',
      path: '/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.success === true);
        } catch {
          resolve(false);
        }
      });
    });

    req.setTimeout(5000, () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

module.exports = { verifyCaptcha };
