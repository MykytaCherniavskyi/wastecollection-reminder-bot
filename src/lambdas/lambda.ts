import { AttributeValue, DeleteItemCommand, DynamoDBClient, PutItemCommand, ScanCommand, ScanOutput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// ========== start types block ==========
interface WasteCollectionItem {
  date: string;
  time?: string;
  location?: string;
  'tip-1'?: boolean;
}

interface AnalysisData {
  [category: string]: WasteCollectionItem[];
}

interface TelegramMessage {
  chat: {
    username: string;
    first_name: string;
    id: number;
    last_name?: string;
  };
  text: string;
}

interface ParsedCommand {
  command: string;
  args: string[];
}
// ========== end types block ==========

// ========== start constants block ==========
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TABLE_NAME = process.env.TABLE_NAME;
const SECRET_TOKEN = process.env.SECRET_TOKEN;
const DAY = 86400000;
const DEFAULT_RESPONSE = {
  statusCode: 200,
  body: JSON.stringify({ message: 'OK' }),
};

const analysisData: AnalysisData = {
  "Restmülltonne ⚫️": [
    { "date": "Do. 19.09.2024" },
    { "date": "Fr. 04.10.2024", "tip-1": true },
    { "date": "Do. 17.10.2024" },
    { "date": "Do. 31.10.2024" },
    { "date": "Do. 14.11.2024" },
    { "date": "Do. 28.11.2024" },
    { "date": "Do. 12.12.2024" },
    { "date": "Fr. 27.12.2024", "tip-1": true }
  ],
  "Biotonne 🟢": [
    { "date": "Do. 12.09.2024" },
    { "date": "Fr. 26.09.2024" },
    { "date": "Do. 10.10.2024" },
    { "date": "Do. 24.10.2024" },
    { "date": "Do. 07.11.2024" },
    { "date": "Do. 21.11.2024" },
    { "date": "Do. 05.12.2024" },
    { "date": "Do. 19.12.2024" }
  ],
  "Papiertonne 🔵": [
    { "date": "Do. 19.09.2024" },
    { "date": "Fr. 04.10.2024", "tip-1": true },
    { "date": "Do. 17.10.2024" },
    { "date": "Do. 31.10.2024" },
    { "date": "Do. 14.11.2024" },
    { "date": "Fr. 28.11.2024" },
    { "date": "Do. 12.12.2024" },
    { "date": "Fr. 27.12.2024", "tip-1": true }
  ],
  "Gelber Sack 🟠": [
    { "date": "Do. 11.09.2024" },
    { "date": "Do. 25.09.2024" },
    { "date": "Do. 09.10.2024" },
    { "date": "Do. 23.10.2024" },
    { "date": "Do. 06.11.2024" },
    { "date": "Do. 20.11.2024" },
    { "date": "Do. 04.12.2024" },
    { "date": "Do. 18.12.2024" }
  ],
  "Problemabfälle 📺": [
    {
      "date": "Sa. 14.09.2024",
      "time": "von 08:30 bis 13:00",
      "location": "Starnberg, Petersbrunner Straße 3 B - Wertstoffhof Starnberg"
    },
    {
      "date": "Sa. 12.10.2024",
      "time": "von 08:30 bis 13:00",
      "location": "Starnberg, Petersbrunner Straße 3 B - Wertstoffhof Starnberg"
    },
    {
      "date": "Sa. 16.11.2024",
      "time": "von 08:30 bis 13:00",
      "location": "Starnberg, Petersbrunner Straße 3 B - Wertstoffhof Starnberg"
    },
    {
      "date": "Sa. 14.12.2024",
      "time": "von 08:30 bis 13:00",
      "location": "Starnberg, Petersbrunner Straße 3 B - Wertstoffhof Starnberg"
    }
  ]
};
// ========== end constants block ==========

// ========== start dynamoDB block ==========
const dynamoDB = new DynamoDBClient({});

const handleSubscribe = async (chatId: number, fullMessage: TelegramMessage): Promise<string> => {
  const userData = fullMessage.chat?.username || `${fullMessage.chat.first_name} ${fullMessage.chat?.last_name ?? ''}`.trim();
  const params = {
      TableName: TABLE_NAME,
      Item: {
          chatId: { N: chatId.toString() },
          username: { S: userData }
      },
      ConditionExpression: "attribute_not_exists(chatId)" // Only put if chatId does not already exist
  };

  try {
      await dynamoDB.send(new PutItemCommand(params));
      return 'Тепер я надсилатиму автоматичні повідомлення про вивіз сміття за день до вивозу у вечірній час. Зі мною про бачок не забудеш. 😉'
  } catch (err: any) {
      if (err.name === "ConditionalCheckFailedException") {
          return 'Ти вже в списку, не кіпішуй.'
      }
      console.error("Error inserting item:", err);
  }
  return 'Error';
};

const handleUnsubscribe = async (chatId: number): Promise<string> => {
  const params = {
      TableName: TABLE_NAME,
      Key: {
          chatId: { N: chatId.toString() },
      },
  };
  await dynamoDB.send(new DeleteItemCommand(params));
  return "Тебе прибрано зі списку отримувачів повідомлення. Повертайся, я сумуватиму.";
};

const getAllChats = async (): Promise<ScanOutput["Items"]> => {
  const params = {
      TableName: TABLE_NAME
  };

  try {
      const res = await dynamoDB.send(new ScanCommand(params));
      return res.Items;
  } catch (err) {
      console.error("Error retrieving items:", err);
  }
  return [];
};
// ========== end dynamoDB block ==========

// ========== start utils block ==========
const convertDynamoDBPayload = (payloadItem: Record<string, AttributeValue>) => unmarshall(payloadItem);

const sendTelegramMessage = async (chatId: number, text: string) => {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

const parseCommand = (text: string): ParsedCommand => {
  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);
  return { command, args };
};


const getTomorrowWasteCollection = (data: AnalysisData): { category: string; item: WasteCollectionItem }[] => {
  const todayMs = new Date().getTime();
  const result: { category: string; item: WasteCollectionItem }[] = [];

  for (const [category, items] of Object.entries(data)) {
    for (const item of items) {
      const [day, month, year] = item.date.split(". ")[1].split(".");
      const formattedDate = `${year}-${month}-${day}`;
      const collectionDateMs = new Date(formattedDate).getTime();

      if (todayMs >= collectionDateMs - DAY && collectionDateMs > todayMs) {
        result.push({ category, item });
        break; // Only the next upcoming date per category is needed, so we break.
      }
    }
  }

  return result.length > 0 ? result : [];
};

const getClosestWasteCollection = (data: AnalysisData): { category: string; item: WasteCollectionItem }[] => {
  const todayMs = new Date().getTime();
  const allCollections: { category: string; item: WasteCollectionItem, collectionDateMs: number }[] = [];

  // Collect all dates with their categories
  for (const [category, items] of Object.entries(data)) {
    for (const item of items) {
      const [day, month, year] = item.date.split(". ")[1].split(".");
      const collectionDateMs = new Date(`${year}-${month}-${day}`).getTime();
      allCollections.push({ category, item, collectionDateMs });
    }
  }

  // Sort by date (ascending)
  allCollections.sort((a, b) => a.collectionDateMs - b.collectionDateMs);

  // Find the first future collection date
  const closestCollection = allCollections.find(
    ({ collectionDateMs }) => collectionDateMs > todayMs
  );

  if (!closestCollection) return []; // If no future collection found

  // Find all collections happening on the same day as the closest one
  const closestDayMs = closestCollection.collectionDateMs;
  const collectionsOnSameDay = allCollections.filter(
    ({ collectionDateMs }) => collectionDateMs === closestDayMs
  );

  return collectionsOnSameDay.map(({ category, item }) => ({ category, item }));
};

const getNextWasteCollections = (useCollection: (data: AnalysisData) => { category: string; item: WasteCollectionItem }[]): string => {
  const nextCollections = useCollection(analysisData);
  
  if (!nextCollections.length) {
    return '';
  }

  let response = "Готуй бачки:\n";
  for (const { category, item } of nextCollections) {
    response += `${category}: ${item.date}`;
    if (item.time) response += ` ${item.time}`;
    if (item.location) response += ` at ${item.location}`;
    response += "\n";
  }
  return response.trim();
};
// ========== end utils block ==========

const handleHelp = () => {
  return `Ти звернувся по допомогу до Трешачка, і це мудрий вибір! 🧠

Я нагадую тобі, коли час виносити сміття, щоб Restmülltonne, Biotonne, Papiertonne, Gelber Sack та навіть Problemabfälle завжди були порожніми, а твоя свідомість — чистою! ✨

Ось кілька команд для твоєї зручності:

•	/subscribe — Підписатися на автоматичні повідомлення про вивіз сміття за день до вивозу у вечірній час.
•	/unsubscribe — Відписатися від сповіщень. (Якщо раптом вирішиш йти своїм шляхом без мене… 😔)
•	/nearest — Дізнатися, коли наступний вивіз сміття, щоб бути готовим.
•	/help — Ось ти вже тут! Завжди радий пояснити, хто я і що роблю.`;
};
const getStartMessage = () => {
  return `Привіт, я Трешачок! Я тут, щоб допомогти тобі не пропустити найважливіший момент — коли вивезуть твоє сміття! 🗑️ Бо ж кому хочеться бути заваленим? 🤯

Що я вмію? Легко! Можу підказати, коли потрібно виносити Restmülltonne, Biotonne, Papiertonne, Gelber Sack або навіть Problemabfälle! Просто підпишися і забудь про зайві хвилювання — я повідомлю вчасно. 😎

Доступні команди:

•	/subscribe — Підписатися на автоматичні повідомлення про вивіз сміття за день до вивозу у вечірній час.
•	/unsubscribe — Відписатись від сповіщень. (Якщо раптом вирішиш йти своїм шляхом без мене… 😔)
•	/nearest — Дізнатися, коли наступний вивіз сміття, щоб бути готовим.
•	/help — Хто я і що я тут роблю?

Тож тримай свій бак на готові — разом ми впораємося з будь-яким сміттям! 💪🌍`;
};

const handleCommand = async (chatId: number, text: string, fullMessage: TelegramMessage): Promise<string> => {
  const { command, args } = parseCommand(text);

  switch (command) {
    case '/subscribe':
      return await handleSubscribe(chatId, fullMessage);
    case '/unsubscribe':
      return await handleUnsubscribe(chatId);
    case '/nearest':
      return getNextWasteCollections(getClosestWasteCollection);
    case '/help':
      return handleHelp();
    case '/start':
      return getStartMessage();
    default:
      return "Невідома команда, броо. Тицни /help щоб побачити що я можу.";
  }
};

const handleCronRequest = async () => {
  const wasteCollections = getNextWasteCollections(getTomorrowWasteCollection)

  if (!wasteCollections) {
      console.log('Nothing waste will collected for the next day')
      return;
  }
  const chats = await getAllChats();
  const parsedChats = chats?.map(convertDynamoDBPayload);
  
  if (!parsedChats?.length) {
      console.log('No more active chats', chats);
      return;
  }
  await Promise.allSettled(parsedChats.map(({ chatId }) => sendTelegramMessage(chatId, wasteCollections)));
}

export const handler = async (event: any) => {
  try {
    const requestTelegramToken = event.telegramToken || event.headers?.['x-telegram-bot-api-secret-token'];

    if (SECRET_TOKEN && requestTelegramToken !== SECRET_TOKEN) {
      throw new Error(`Not correct secret token. Recieved token - ${requestTelegramToken}`);
    }
    const isCron = event.isCron;

    if (isCron) {
        await handleCronRequest();
        return DEFAULT_RESPONSE;
    }
    // for prod enouch JSON.parse(event?.body)
    const body = event?.body ? JSON.parse(event?.body) : event;
    const message: TelegramMessage = body?.message || event?.message;
    const chatId = message.chat.id;
    const text = message.text;
  
    const response = await handleCommand(chatId, text, message);
    await sendTelegramMessage(chatId, response);
  
    return DEFAULT_RESPONSE;
  } catch (e: any) {
    console.log('Handle Error - ', e);
    return DEFAULT_RESPONSE;
  }

};