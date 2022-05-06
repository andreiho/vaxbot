const { config } = require("dotenv");
config();

const chromium = require("chrome-aws-lambda");
const TelegramBot = require("node-telegram-bot-api");

const buff = Buffer.from(process.env.DATA, "base64");
const data = JSON.parse(buff.toString("utf-8"));
const token = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(token, {
  polling: true,
});

async function sendMessage(chatId, message, photo) {
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

async function loanbot() {
  const initialUrl = "https://rd.dk/kurser-og-renter";

  const browser = await chromium.puppeteer.launch({
    args: [...chromium.args, "--hide-scrollbars", "--disable-web-security"],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1600,
    height: 1200,
    deviceScaleFactor: 1,
  });

  await page.goto(initialUrl);
  // await page.waitForNavigation({ waitUntil: "domcontentloaded" });

  const [cookieButton] = await page.$x(
    "//button[contains(text(), 'OK til nødvendige')]"
  );
  if (cookieButton) {
    await cookieButton.click();
  }

  await page.evaluate(() => {
    document.querySelector("table").scrollIntoView();
    window.scrollBy(0, -120);
  });

  const screenshot = await page.screenshot();

  const datetime = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/Copenhagen",
  });

  const loans = await page.evaluate(async () => {
    document.querySelector("table").scrollIntoView();
    window.scrollBy(0, -120);

    return [...document.querySelectorAll("table tbody tr")]
      .map((row) => {
        const [name, actualPrice] = [...row.querySelectorAll("td")]
          .filter((cell) => !!cell.innerText)
          .map((cell) => cell.innerText);

        if (name.startsWith("Fastforrentet")) {
          return `${name
            .replaceAll("\n", " ")
            .replaceAll("*", "")
            .split("DK")[0]
            .split("/")[1]
            .trim()} - ${actualPrice} ${
            name.includes("afdragsfrihed") ? "*" : ""
          }`;
        }
        return null;
      })
      .filter(Boolean);
  });

  await sendMessage(
    process.env.LOAN_CHAT_ID,
    `
${datetime}

Fastforrentede lån:

• ${loans.join(`\n• `)}
`,
    screenshot
  );

  // Finish and close
  await browser.close();
}

async function vaxbot(centre) {
  const initialUrl =
    "https://www.regionh.dk/presse-og-nyt/pressemeddelelser-og-nyheder/Sider/Tilmelding-til-at-modtage-overskydende-vaccine-mod-COVID-19.aspx";

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

module.exports = { loanbot, vaxbot, sendMessage };
