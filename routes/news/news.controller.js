const news = require('../../models/news.model.js')
const CryptoSymbol = require('../../models/CryptoSymbol.model.js')
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const moment = require('moment');
const xml2js = require('xml2js');
const puppeteer = require('puppeteer');

const {
    twitterClient
} = require("./twitterClient.js");
const {
    symbol
} = require('joi');
require("dotenv").config({
    path: __dirname + "../../.env"
});

// async function fetchTopCryptocurrencies() {
exports.syncSymbol = async (req, res) => {
    try {
        const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest', {
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKET_API_KEY,
                'Accept': 'application/json'
            },
            params: {
                limit: 1000,
                convert: 'USD'
            }
        });

        const payload = {
            data: response.data.data.map(coin => ({
                name: coin.name,
                symbol: coin.symbol,
            }))
        };
        for (const cryptoData of payload.data) {
            const existingCrypto = await CryptoSymbol.findOne({
                symbol: cryptoData.symbol
            });
            if (!existingCrypto) {
                const cryptoSymbol = new CryptoSymbol({
                    symbol: cryptoData.symbol,
                    name: cryptoData.name,
                });
                await cryptoSymbol.save();
                console.log(`Saved ${cryptoSymbol.name} (${cryptoSymbol.symbol})`);
            } else {
                console.log(`Skipped ${cryptoData.name} (${cryptoData.symbol}), already exists.`);
            }
        }
    } catch (error) {
        if (error.response) {
            throw new Error(`API Error: ${error.response.data.status?.error_message || error.response.statusText}`);
        }
        throw new Error(`Failed to fetch cryptocurrencies: ${error.message}`);
    }
}

// async function saveCryptocurrency(cryptoData) {
//     try {
//       const cryptoSymbol = new CryptoSymbol({
//         symbol: cryptoData.symbol,
//         name: cryptoData.name,
//       });

//       await cryptoSymbol.save();
//       console.log(`Saved ${cryptoSymbol.name} (${cryptoSymbol.symbol})`);
//     } catch (error) {
//       console.error(`Error saving crypto data: ${error.message}`);
//     }
//   }

class CryptoTracker {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://pro-api.coinmarketcap.com/v1';
        this.headers = {
            'X-CMC_PRO_API_KEY': apiKey,
            'Accept': 'application/json'
        };
    }

    async getTokenData(symbol) {
        try {
            const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
                headers: this.headers,
                params: {
                    symbol: symbol.toUpperCase(),
                    convert: 'USD'
                }
            });

            const tokenData = response.data.data[symbol.toUpperCase()];
            const quote = tokenData.quote.USD;

            const payload = {
                name: tokenData.name,
                symbol: tokenData.symbol,
                price: quote.price,
                change_1h: quote.percent_change_1h,
                change_24h: quote.percent_change_24h,
                change_7d: quote.percent_change_7d,
                market_cap: quote.market_cap,
                volume_24h: quote.volume_24h,
                last_updated: quote.last_updated
            };
            console.log(payload);
            return payload;
        } catch (error) {
            if (error.response) {
                throw new Error(`API Error: ${error.response.data.status.error_message}`);
            } else if (error.request) {
                throw new Error('No response received from the server');
            } else {
                throw new Error(`Error: ${error.message}`);
            }
        }
    }
}


async function cryptopanic() {
    try {
        const apiKey = 'e9dc2ae20c43065f468ac65b5e0544c52611e6d8';
        const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${apiKey}`;
        const response = await axios.get(url);
        const newsData = response.data;
        return newsData.results.map(article => ({
            title: article.title,
            url: article.url,
            publishedAt: article.published_at,
            source: article.source.domain,
            Blockchain: Array.isArray(article.currencies) ? article.currencies.map(currency => currency.title) : []
        }));
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

class CryptopotatoScraper {
    constructor() {
        this.url = "https://cryptopotato.com/crypto-news/";
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
    }

    async scrape() {
        try {
            console.log('Starting to scrape Cryptopotato news...\n');
            const response = await axios.get(this.url, {
                headers: this.headers
            });
            const $ = cheerio.load(response.data);
            const newsItems = $("li.rpwe-li.rpwe-clearfix");
            const newsData = [];

            newsItems.each((index, element) => {
                const title = $(element).find("h3.rpwe-title").text().trim();
                const link = $(element).find("a").attr("href");
                const timeTag = $(element).find("time.rpwe-time.published");
                const publishTime = timeTag.length ? timeTag.text().trim() : "No date available";

                newsData.push({
                    title: title,
                    url: link,
                    publishTime: publishTime
                });
            });

            return newsData;
        } catch (error) {
            if (error.response && error.response.status === 403) {
                console.error('Access denied. The website might be blocking web scraping attempts.');
            } else {
                console.error('Error while scraping:', error.message);
            }
        }
    }
}

class ThenewscryptoMainScraper {
    constructor() {
        this.url = "https://thenewscrypto.com/news/blockchain-news/";
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
    }
    async scrape() {
        try {
            console.log('Starting to scrape Cryptopotato news...\n');
            const response = await axios.get(this.url, {
                headers: this.headers
            });
            const $ = cheerio.load(response.data);
            const newsItems = $("div.card-body.d-flex.flex-column.h-100");
            const newsData = [];
            newsItems.each((index, newsItem) => {
                const titleTag = $(newsItem).find("h3.card-title.fs-17");
                if (titleTag.length) {
                    const title = titleTag.text().trim();
                    const link = titleTag.find("a").attr("href");
                    const description =
                        $(newsItem).find("p").text().trim() || "No description";
                    const timeTag = $(newsItem).find("small.text-muted.fs-12");
                    const timeText = timeTag.text().trim() || "No time available";
                    newsData.push({
                        title: title,
                        url: link,
                        content: description,
                        publishTime: timeText
                    });
                }
            });
            return newsData;
        } catch (error) {
            if (error.response && error.response.status === 403) {
                console.error('Access denied. The website might be blocking web scraping attempts.');
            } else {
                console.error('Error while scraping:', error.message);
            }
        }
    }
}

class cryptoslateScraper {
    constructor() {
        this.url = "https://cryptoslate.com/news/";
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
    }
    async scrape() {
        try {
            console.log('Starting to scrape cryptoslate news...\n');
            const {
                data
            } = await axios.get(this.url, {
                headers: this.headers
            });
            const $ = cheerio.load(data);
            const newsData = [];
            $("div.list-post article").each((index, element) => {
                const titleElem = $(element).find("div.title h2");
                const linkElem = $(element).find("a");
                const timestampElem = $(element).find("div.post-meta");
                const summaryElem = $(element).find("div.excerpt p");


                if (titleElem.length && linkElem.length) {
                    newsData.push({
                        title: titleElem.text().trim(),
                        url: linkElem.attr("href"),
                        publishTime: timestampElem.length ? timestampElem.text().trim() : "Unknown",
                        content: summaryElem.length ?
                            summaryElem.text().trim() : "No summary available",
                    });
                }
            });
            return newsData;
        } catch (error) {
            if (error.response && error.response.status === 403) {
                console.error('Access denied. The website might be blocking web scraping attempts.');
            } else {
                console.error('Error while scraping:', error.message);
            }
        }
    }
}

class newsbtcScraper {
    constructor() {
        this.url = "https://www.newsbtc.com/";
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
    }
    async scrape() {
        try {
            console.log('Starting to scrape NewsBTC...\n');
            const {
                data
            } = await axios.get(this.url, {
                headers: this.headers
            });
            const $ = cheerio.load(data);
            const articles = $(".block-article__content");
            const newsData = [];
            articles.each((index, article) => {
                const title =
                    $(article).find(".block-article__title").text().trim() ||
                    "No Title";
                const url = $(article).find("a").attr("href") || "No Link";
                const content =
                    $(article).find(".block-article__excerpt").text().trim() ||
                    "No Excerpt";
                const source =
                    $(article).find(".block-article__author").text().trim() ||
                    "No Author";
                if (title) {
                    newsData.push({
                        title,
                        url,
                        source,
                        content,
                    });
                }
            });
            return newsData;
        } catch (error) {
            if (error.response && error.response.status === 403) {
                console.error('Access denied. The website might be blocking web scraping attempts.');
            } else {
                console.error('Error while scraping:', error.message);
            }
        }
    }
}

async function newsApi() {
    try {
        const apiKey = '56bf05da064545a8bd15afd226a0a65b';
        const url = `https://newsapi.org/v2/everything?q=cryptocurrency&apiKey=${apiKey}`;
        const response = await axios.get(url);
        const newsData = response.data;
        return newsData.articles.map(article => ({
            title: article.title,
            content: article.content,
            url: article.url,
            publishedAt: article.publishedAt,
            source: article.source.name,
        }));
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}

class BitsMediaScraper {
    constructor() {
        this.url = 'https://bits.media/';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
    }

    async scrape() {
        try {
            console.log('Starting to scrape Bits.media news...\n');
            const response = await axios.get(this.url, {
                headers: this.headers
            });
            const $ = cheerio.load(response.data);
            const newsItems = $('.news-item');
            const newsData = [];
            // console.log(newsItems)
            newsItems.each((index, element) => {
                const title = $(element).find('.news-name').text().trim();
                const link = 'https://bits.media' + $(element).find('a').attr('href');
                const publishTime = $(element).find('.news-date').text().trim();
                newsData.push({
                    title: title,
                    url: link,
                    publishTime: publishTime,
                });
            });

            return newsData;
        } catch (error) {
            if (error.response && error.response.status === 403) {
                console.error('Access denied. The website might be blocking web scraping attempts.');
            } else {
                console.error('Error while scraping:', error.message);
            }
        }
    }
}

class AmbCryptoScraper {
    constructor() {
        this.url = 'https://ambcrypto.com/';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
    }

    async scrape() {
        try {
            console.log('Starting to scrape AmbCrypto news...\n');
            const response = await axios.get(this.url, {
                headers: this.headers
            });
            const $ = cheerio.load(response.data);

            const newsItems = $('li.home-post.infinite-post');
            const newsData = [];

            newsItems.each((index, element) => {
                const title = $(element).find('h2').text().trim();
                const relativeLink = $(element).find('a[rel="bookmark"]').attr('href');
                const link = relativeLink.startsWith('http') ? relativeLink : `https://ambcrypto.com${relativeLink}`;
                const category = $(element).find('.mvp-cd-cat').text().trim();
                const time = $(element).find('.mvp-cd-date').text().trim();
                newsData.push({
                    title: title,
                    url: link,
                    publishTime: time,
                    Blockchain: category
                });
            });
            return newsData;
        } catch (error) {
            if (error.response) {
                console.error(`HTTP Error: ${error.response.status}`);
            } else {
                console.error('Error while scraping:', error.message);
            }
        }
    }
}

class CoinTelegraphRSSReader {
    constructor() {
        this.rssUrl = 'https://cointelegraph.com/rss';
    }

    async getData() {
        try {
            console.log('Fetching RSS feed...');
            const response = await axios.get(this.rssUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/rss+xml,application/xml;q=0.9'
                },
                timeout: 10000
            });

            console.log('Parsing RSS data...');
            const parser = new xml2js.Parser({
                explicitArray: false,
                trim: true
            });

            const result = await parser.parseStringPromise(response.data);
            const items = result.rss.channel.item;

            return items.map(item => ({
                title: item.title,
                content: this.cleanDescription(item.description),
                url: item.link,
                publishTime: item.pubDate,
                Blockchain: item.category
            }));

        } catch (error) {
            console.error('Error fetching RSS feed:', error.message);
            return [];
        }
    }

    cleanDescription(description) {
        return description
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
}


class TheNewsCryptoScraper {
    constructor() {
        this.url = 'https://thenewscrypto.com/';
    }
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async scrapeNews() {
        let browser = null;
        try {
            console.log('Launching browser...');
            browser = await puppeteer.launch({
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920x1080',
                ]
            });
            const page = await browser.newPage();
            await page.setViewport({
                width: 1920,
                height: 1080
            });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
                    request.abort();
                } else {
                    request.continue();
                }
            });
            console.log('Navigating to TheNewsCrypto...');
            await page.goto(this.url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            console.log('Waiting for content to load...');
            await this.delay(2000);

            const articles = await page.evaluate(() => {
                const items = [];
                const articleElements = document.querySelectorAll('article, .post, .news-item, .article-item, .post-item');

                articleElements.forEach(element => {
                    const title = element.querySelector('h1, h2, h3, .title, [class*="title"]')?.textContent.trim();
                    const link = element.querySelector('a')?.href;
                    const summary = element.querySelector('p, .excerpt, .summary, [class*="excerpt"], [class*="summary"]')?.textContent.trim();
                    const timestamp = element.querySelector('time, .date, [class*="date"], [class*="time"]')?.textContent.trim();
                    const category = element.querySelector('.category, [class*="category"], [class*="tag"]')?.textContent.trim();

                    if (title && link) {
                        items.push({
                            title,
                            url: link,
                            content: summary,
                            publishTime: timestamp,
                        });
                    }
                });
                return items;
            });
            if (articles.length === 0) {
                console.log('No articles found. Taking screenshot for debugging...');
                await page.screenshot({
                    path: 'debug-newscrypto.png'
                });
                throw new Error('No articles found on the page');
            }
            const uniqueArticles = Array.from(new Map(articles.map(article => [article.title, article])).values());

            return uniqueArticles;

        } catch (error) {
            console.error('Error scraping TheNewsCrypto:', error.message);
            return [];
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

class CryptopolitanScraper {
    constructor() {
        this.rssUrl = 'https://www.cryptopolitan.com/feed/';
    }

    async scrapeNews() {
        try {
            console.log('Fetching RSS feed...');
            const response = await axios.get(this.rssUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            console.log('Parsing RSS feed...');
            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true
            });
            const result = await parser.parseStringPromise(response.data);
            const items = result.rss.channel.item;
            const articles = items.map(item => {
                const categories = Array.isArray(item.category) ?
                    item.category.join(', ') :
                    item.category || 'Uncategorized';
                const summary = item.description
                    .replace(/<[^>]*>/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                return {
                    title: item.title,
                    url: item.link,
                    publishedAt: item.pubDate,
                    content: summary.length > 200 ?
                        summary.substring(0, 200) + '...' : summary,
                    source: item['dc:creator'] || 'Unknown'
                };
            });
            if (articles.length === 0) {
                throw new Error('No articles found in the RSS feed');
            }
            return articles;
        } catch (error) {
            if (error.response) {
                console.error('RSS feed request failed:', error.response.status, error.response.statusText);
                if (error.response.status === 403) {
                    console.error('Access forbidden. The site might be blocking RSS feed access.');
                }
            } else if (error.request) {
                console.error('No response received:', error.message);
            } else {
                console.error('Error processing RSS feed:', error.message);
            }
            throw error;
        }
    }
}

async function watchGuru() {
    try {
        const url = `https://api.watcher.guru/content/data?news=10`;
        const response = await axios.get(url);
        const newsData = response.data;
        return newsData.map(article => ({
            title: article.title,
            url: article.url,
            content: article.description,
            publishTime: new Date(article.published * 1000).toLocaleString()
        }));
    } catch (error) {
        console.error('Error fetching news:', error);
        return [];
    }
}




exports.runAiagent = async (req, res) => {
    cron.schedule('0 */2 * * *', () => {
        getnews();
        console.log("News fetched at: " + new Date().toLocaleString());
    });
    // cron.schedule('*/30 * * * *', () => {
    //     getnews();
    //     console.log("News fetched at: " + new Date().toLocaleString());
    // });
    res.send(`AI Agent started and cron job scheduled for every 2 hours ${new Date().toLocaleString()}`);
};

// let latestnews = null
// let counts = null
// let times = null

exports.getAiagent = async (req, res) => {
    try {
      let { time, count } = req.query;
  
      const timeMap = {
        '10m': 10,
        '30m': 30,
        '1h': 60,
        '12h': 720,
        '24h': 1440
      };
  
      if (!timeMap[time]) {
        time = '30m';
      }
  
      count = parseInt(count);
      if (isNaN(count) || count < 1) count = 1;
      if (count > 10) count = 10;
  
      await getnews(); // Fetch latest news to DB
  
      const latestnews = await bestNews(timeMap[time], count);
  
      const cleanData = latestnews.map(item => ({
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt,
        source: item.source,
        blockchain: item.blockchain
      }));
  
      res.send(cleanData);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error fetching AI agent news');
    }
  };
  



// exports.getnews = async (req, res) => {
async function getnews() {
    try {
        const cryptopanicData = await cryptopanic();
        const newsApiData = await newsApi();
        const watchGuruData = await watchGuru();
        const BMscraper = new BitsMediaScraper();
        const bitMediaData = await BMscraper.scrape();
        const ACscraper = new AmbCryptoScraper();
        const AmbCryptoData = await ACscraper.scrape();
        const CoinTelegraphreader = new CoinTelegraphRSSReader();
        const CoinTelegraphData = await CoinTelegraphreader.getData();
        const TheNewsCryptoreader = new TheNewsCryptoScraper();
        const TheNewsCryptoData = await TheNewsCryptoreader.scrapeNews();
        const Cryptopolitanreader = new CryptopolitanScraper();
        const CryptopolitanData = await Cryptopolitanreader.scrapeNews();
        const Cryptopotatoreader = new CryptopotatoScraper();
        const CryptopotatoData = await Cryptopotatoreader.scrape();
        // const Thenewscryptoreadermain = new ThenewscryptoMainScraper();
        // const ThenewscryptoMainData = await Thenewscryptoreadermain.scrape();
        const cryptoslatereader = new cryptoslateScraper();
        const cryptoslateData = await cryptoslatereader.scrape();
        const newsbtcreader = new newsbtcScraper();
        const newsbtcData = await newsbtcreader.scrape();
        const combinedData = [
            ...cryptopanicData,
            ...newsApiData,
            ...watchGuruData,
            ...bitMediaData,
            ...AmbCryptoData,
            ...TheNewsCryptoData,
            ...CoinTelegraphData,
            ...CryptopolitanData,
            ...CryptopotatoData,
            // ...ThenewscryptoMainData,
            ...cryptoslateData,
            ...newsbtcData,
        ];
        const insertPromises = [];
        let addedCount = 0;
        for (let i = 0; i < combinedData.length; i++) {
            const data = combinedData[i];
            const existing = await news.findOne({
                title: data.title
            });
            if (!existing) {
                const newPlan = new news({
                    title: data.title,
                    url: data.url,
                    publishedAt: data.publishedAt,
                    source: data.source,
                    content: data.content,
                    blockchain: data.blockchain
                });
                insertPromises.push(newPlan.save());
                addedCount++;
            }
        }
        await Promise.all(insertPromises);
        const bestNewsResult = await bestNews();
        console.log(`Scan is done. ${addedCount} new items added.`);
        return bestNewsResult;
    } catch (err) {
        console.error(err);
    }
};


async function bestNews(minutes, count) {
    try {
      const sinceTime = moment().subtract(minutes, 'minutes').toDate();
  
      const newsItems = await news.find({
        createdAt: {
          $gte: sinceTime
        }
      });

        const cryptoKeywords = [
            // General Crypto Keywords
            'crypto', 'cryptocurrency', 'blockchain', 'web3', 'defi', 'nft', 'dapp', 'dao', 'altcoin', 'stablecoin', 'hashgraph',
            'token', 'tokenomics', 'whitepaper', 'mining', 'hash rate', 'consensus mechanism', 'proof of work', 'proof of stake',
            'delegated proof of stake', 'validator', 'node', 'ledger', 'distributed ledger', 'decentralization', 'cold storage',
            'hot wallet', 'protocol', 'layer 1', 'layer 2', 'sidechain', 'mainnet', 'testnet', 'fork', 'hard fork', 'soft fork',

            // Bitcoin & Ethereum Specific
            'bitcoin', 'ethereum', 'bitcoin halving', 'gas fees', 'smart contracts', 'ethereum 2.0', 'staking',
            'satoshi', 'satoshi nakamoto', 'vitalik buterin', 'gwei', 'ether', 'wei', 'block reward', 'hashrate', 'difficulty adjustment',
            'evm', 'ethereum virtual machine', 'solidity', 'eip', 'ethereum improvement proposal', 'lightning network', 'taproot',
            'segregated witness', 'segwit', 'multisig', 'bip', 'bitcoin improvement proposal', 'ordinals',

            // Trading & Market Sentiment
            'bullish', 'bearish', 'pump', 'dump', 'breakout', 'support', 'resistance', 'liquidation', 'volatility',
            'whale', 'market cap', 'volume spike', 'fomo', 'fud', 'dyor', 'hodl', 'position', 'leverage', 'margin', 'short', 'long',
            'limit order', 'stop loss', 'take profit', 'diamond hands', 'paper hands', 'dca', 'dollar cost averaging', 'rekt',
            'all time high', 'ath', 'all time low', 'atl', 'market cycle', 'technical analysis', 'ta', 'fundamental analysis',
            'price target', 'correction', 'consolidation', 'overbought', 'oversold', 'trading volume', 'market sentiment',

            // News Impacting Crypto Markets
            'sec', 'etf', 'crypto ban', 'crypto regulation', 'interest rates', 'inflation', 'recession', 'monetary policy',
            'federal reserve', 'adoption', 'partnerships', 'cftc', 'central bank', 'cbdc', 'central bank digital currency',
            'treasury', 'compliance', 'kyc', 'know your customer', 'aml', 'anti-money laundering', 'sanctions', 'blacklist',
            'regulatory clarity', 'legal status', 'commodity', 'security', 'utility token', 'guidance', 'lawsuit', 'legislation',
            'hearing', 'congressional hearing', 'executive order', 'tax implications', 'tax reporting',

            // Crypto Projects & Coins
            'solana', 'binance coin', 'ripple', 'cardano', 'polkadot', 'avalanche', 'chainlink', 'dogecoin', 'shiba inu', 'hedera',
            'tether', 'usdc', 'polygon', 'bnb chain', 'terra', 'cosmos', 'algorand', 'stellar', 'xrp', 'ada', 'dot', 'avax', 'link',
            'doge', 'shib', 'hbar', 'usdt', 'matic', 'atom', 'algo', 'xlm', 'litecoin', 'ltc', 'monero', 'xmr', 'uniswap', 'uni',
            'aave', 'maker', 'mkr', 'compound', 'comp', 'the graph', 'grt', 'fantom', 'ftm', 'near protocol', 'near',

            // DeFi Keywords
            'yield farming', 'liquidity pool', 'amm', 'automated market maker', 'dex', 'decentralized exchange', 'cex', 'centralized exchange',
            'lending', 'borrowing', 'collateral', 'liquidation threshold', 'flash loan', 'impermanent loss', 'slippage', 'stableswap',
            'governance token', 'voting power', 'treasury', 'protocol owned liquidity', 'tvl', 'total value locked', 'apr', 'apy',
            'swap', 'bridge', 'cross-chain', 'wrapped token', 'synthetic asset', 'oracle', 'price oracle',

            // NFT Keywords
            'nft marketplace', 'opensea', 'rarible', 'floor price', 'mint', 'minting', 'collection', 'pfp', 'profile picture',
            'art blocks', 'generative art', 'royalties', 'metadata', 'token uri', 'rarity', 'trait', 'attribute', 'bored ape',
            'cryptopunks', 'azuki', 'doodles', 'metaverse', 'virtual land', 'wearable', 'fractionalized', 'air drop', 'whitelist',

            // Technical Terms
            'pow', 'pos', 'dpos', 'pbft', 'api', 'hash', 'sha-256', 'cryptography', 'private key', 'public key', 'asymmetric encryption',
            'zero-knowledge proof', 'zk-rollup', 'optimistic rollup', 'sharding', 'interoperability', 'finality', 'mempool',
            'block explorer', 'merkle tree', 'state channel', 'gas limit', 'nonce', 'signature', 'multi-sig', 'seed phrase',
            'mnemonic', 'derivation path', 'rpc node', 'api endpoint', 'json rpc',

            // Exchanges and Infrastructure
            'binance', 'coinbase', 'kraken', 'ftx', 'kucoin', 'gemini', 'okx', 'bitfinex', 'huobi', 'bybit',
            'ledger', 'trezor', 'metamask', 'wallet connect', 'infura', 'alchemy', 'chainstack', 'etherscan', 'blockchain explorer',
            'coinmarketcap', 'coingecko', 'tradingview', 'glassnode', 'nansen', 'dune analytics',
        ];


        const cryptoNews = newsItems.filter(newsItem =>
            cryptoKeywords.some(keyword => newsItem.title.toLowerCase().includes(keyword))
          );
      
          if (cryptoNews.length === 0) {
            console.log("No crypto-related news found.");
            return [];
          }
      
          function getKeywordDensity(sentence) {
            const words = sentence.toLowerCase().split(/\s+/);
            const totalWords = words.length;
            const wordFrequency = {};
      
            words.forEach(word => {
              wordFrequency[word] = (wordFrequency[word] || 0) + 1;
            });
      
            return Object.values(wordFrequency).reduce((sum, freq) =>
              sum + (freq / totalWords), 0) / Object.keys(wordFrequency).length;
          }
      
          function getStructureScore(sentence) {
            const hasCapital = /^[A-Z]/.test(sentence);
            const hasProperEnd = /[.!?]$/.test(sentence);
            const properLength = sentence.split(/\s+/).length >= 5 &&
              sentence.split(/\s+/).length <= 25;
      
            return (hasCapital ? 0.3 : 0) +
              (hasProperEnd ? 0.3 : 0) +
              (properLength ? 0.4 : 0);
          }
      
          function getReadabilityScore(sentence) {
            const words = sentence.split(/\s+/);
            const avgWordLength = words.join('').length / words.length;
            return 1 - Math.abs(avgWordLength - 5) / 10;
          }
      
          const analyzedCryptoNews = cryptoNews.map(newsItem => {
            const sentence = newsItem.title;
            const keywordDensity = getKeywordDensity(sentence);
            const structureScore = getStructureScore(sentence);
            const readabilityScore = getReadabilityScore(sentence);
      
            const totalScore = (
              keywordDensity * 0.3 +
              structureScore * 0.4 +
              readabilityScore * 0.3
            );
      
            return {
              ...newsItem.toObject(),
              analysis: {
                keywordDensity: keywordDensity.toFixed(2),
                structure: structureScore.toFixed(2),
                readability: readabilityScore.toFixed(2),
                totalScore: totalScore.toFixed(2)
              }
            };
          });
      
          const sortedCryptoNews = analyzedCryptoNews.sort((a, b) =>
            parseFloat(b.analysis.totalScore) - parseFloat(a.analysis.totalScore)
          );
      
          return sortedCryptoNews.slice(0, count);
      
        } catch (err) {
          console.error('Error in bestCryptoNews:', err);
          return [];
    }
};




const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

