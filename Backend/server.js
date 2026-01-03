import express from 'express';
import user from './user.js';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/users', (req, res) => {
  res.json(user);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server at http://localhost:${PORT}`);
});

 