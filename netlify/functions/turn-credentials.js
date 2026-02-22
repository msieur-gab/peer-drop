export default async () => {
  const app = process.env.METERED_APP;
  const key = process.env.METERED_KEY;

  if (!app || !key) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const res = await fetch(
    `https://${app}.metered.live/api/v1/turn/credentials?apiKey=${key}`
  );
  const body = await res.text();

  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
