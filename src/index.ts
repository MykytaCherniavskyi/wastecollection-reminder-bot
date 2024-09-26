import bodyParser from 'body-parser';
import express, { Request, Response } from 'express';
import * as lambda from './lambdas/lambda';

const app = express();
const port = 3000;

// Parse JSON bodies
app.use(bodyParser.json());
// Parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.post('/', async (req: Request, res: Response) => {
  const response = await lambda.handler({ ...req.body, telegramToken: req.headers['x-telegram-bot-api-secret-token'] });
  res.send(response);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});