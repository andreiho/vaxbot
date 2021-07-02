const { config } = require("dotenv");
config();

const chromium = require("chrome-aws-lambda");
const TelegramBot = require("node-telegram-bot-api");

const initialUrl =
  "https://www.regionh.dk/presse-og-nyt/pressemeddelelser-og-nyheder/Sider/Tilmelding-til-at-modtage-overskydende-vaccine-mod-COVID-19.aspx";

const buff = Buffer.from(process.env.DATA, "base64");
const data = JSON.parse(buff.toString("utf-8"));
const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.CHAT_ID;

const bot = new TelegramBot(token, {
  polling: true,
});

async function sendMessage(message, photo) {
  const requests = [];

  if (message) {
    requests.push(bot.sendMessage(chatId, message));
  }
  if (photo) {
    requests.push(
      bot.sendPhoto(chatId, photo, {
        filename: "screenshot",
        contentType: "image/png",
      })
    );
  }

  return Promise.all(requests);
}

async function run(centre) {
  const textInput = 'input[type="text"]';

  const browser = await chromium.puppeteer.launch({
    args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
  });

  await page.goto(initialUrl);
  await page.waitForNavigation({ waitUntil: "domcontentloaded" });

  const next = async () => {
    await page.evaluate(() =>
      document.querySelector('input[name="next"]').click()
    );

    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
  };

  await next();

  // First dose checkbox - No
  await page.click('input[data-choice-label-value="2"]');

  await next();

  // Full name
  await page.focus(textInput);
  await page.keyboard.type(data.name);

  await next();

  // Age
  await page.focus(textInput);
  await page.keyboard.type(data.age);

  await next();

  // Address, street
  await page.focus(textInput);
  await page.keyboard.type(data.street);

  await next();

  // Address, postal code and city
  await page.focus(textInput);
  await page.keyboard.type(data.city);

  await next();

  // Phone
  await page.focus(textInput);
  await page.keyboard.type(data.phone);

  await next();

  // Vaccine center
  const [option] = await page.$x(`//label[contains(text(), '${centre}')]`);
  await option.click();

  await next();

  // Accept terms
  await next();

  // Finish and close
  await next();

  await browser.close();
}

module.exports = { run, sendMessage };
