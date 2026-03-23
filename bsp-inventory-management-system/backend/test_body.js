const express = require('express');
const app = express();
app.use(express.json());
app.post('/', (req,res) => res.json({type: typeof req.body, val: req.body}));
const server = app.listen(0, async () => {
  const port = server.address().port;
  const res = await fetch('http://localhost:' + port, {method: 'POST'});
  console.log(await res.json());
  server.close();
});
