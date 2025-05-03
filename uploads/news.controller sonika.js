const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const OpenAI = require('openai');
const moment = require('moment');
const xml2js = require('xml2js');
const puppeteer = require('puppeteer');

const openai = new OpenAI({
    apiKey: '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'
});

const {
    twitterClient
} = require("../routes/news/twitterClient.js");
require("dotenv").config({
    path: __dirname + "../../.env"
});

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
            // console.log(newsItems[0])
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


async function runAiagent() {
    // cron.schedule('0 */2 * * *', () => {
    getnews();

    console.log("News fetched at: " + new Date().toLocaleString());
    // });
    console.log(`AI Agent started and cron job scheduled for every 2 hours ${new Date().toLocaleString()}`);
};

runAiagent()

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
        const combinedData = [
            ...cryptopanicData,
            ...newsApiData,
            ...watchGuruData,
            ...bitMediaData,
            ...AmbCryptoData,
            ...TheNewsCryptoData,
            ...CoinTelegraphData,
            ...CryptopolitanData,
        ];
        let addedCount = 0;
        bestNews(combinedData);
        console.log(`Scan is done. ${addedCount} new items added.`)
        // res.status(200).json({
        //     message: `Scan is done. ${addedCount} new items added.`
        // });
    } catch (err) {
        console.error(err);
    }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function safeTweet(twitterClient, data, maxRetries = 5) {
    let retryCount = 0;
    let baseDelay = 2000;
    while (retryCount < maxRetries) {
        try {
            const response = await twitterClient.v2.tweet(data);
            console.log("Tweet posted successfully!");
            return response;
        } catch (error) {
            console.error(`Attempt ${retryCount + 1} failed:`, error.data || error.message);

            if (error.code === 429) {
                const rateLimitReset = error.rateLimit?.reset;
                const dayLimitReset = error.rateLimit?.day?.reset;

                if (dayLimitReset && error.rateLimit.day.remaining === 0) {
                    const waitTime = (dayLimitReset - Date.now() / 1000) * 1000;
                    console.log(`Daily limit reached. Waiting until reset: ${new Date(Date.now() + waitTime).toLocaleString()}`);
                    await delay(waitTime);
                } else if (rateLimitReset) {
                    const waitTime = (rateLimitReset - Date.now() / 1000) * 1000;
                    console.log(`Rate limit exceeded. Waiting for ${Math.ceil(waitTime / 1000)} seconds...`);
                    await delay(waitTime);
                } else {
                    const backoffTime = baseDelay * Math.pow(2, retryCount);
                    console.log(`Using exponential backoff: waiting ${backoffTime / 1000} seconds...`);
                    await delay(backoffTime);
                }

                retryCount++;
                continue;
            }

            throw error;
        }
    }

    throw new Error(`Failed to tweet after ${maxRetries} retries`);
}



exports.imageNews = async (req, res) => {
    try {
        const {
            prompt
        } = req.body;
        const response = await openai.images.generate({
            model: "dall-e-2",
            prompt: prompt,
            n: 1,
            size: "256x256",
        });

        console.log(response.data[0].url);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: 'Server error'
        });
    }
};

async function bestNews(data) {
    // exports.bestNews = async (req, res) => {
    try {
        const insertPromises = [];
        for (let i = 0; i < combinedData.length; i++) {
            const data = combinedData[i];
            if (data) {
                const payload = {
                    title: data.title,
                    url: data.url,
                    publishedAt: data.publishedAt,
                    source: data.source,
                    content: data.content,
                    blockchain: data.blockchain
                };
                insertPromises.push(payload);
                addedCount++;
            }
        }
        
        const twoHoursAgo = moment().subtract(120, 'minutes').toDate();
        const newsItems = insertPromises.filter(item => item.publishedAt >= twoHoursAgo);
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

        const analyzedNews = newsItems.map(newsItem => {
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

        const sortedNews = analyzedNews.sort((a, b) =>
            parseFloat(b.analysis.totalScore) - parseFloat(a.analysis.totalScore)
        );

        // console.log(sortedNews[0]?.title)
        promptServer(sortedNews[0])
        // res.status(200).json({
        //     success: true,
        //     count: sortedNews.length,
        //     data: sortedNews
        // });

    } catch (err) {
        console.error('Error in bestNews:', err);
        res.status(500).json({
            success: false,
            message: 'Server error while analyzing news'
        });
    }
};


// 

async function promptServer(data) {
    try {
        // const prompt = `'title:-${data.title}   content:-${data?.content}'.       Rewrite a tweet (between 15 and 20 words) for a crypto news title. Include relevant hashtags. Do not add explanations or extra words`;
        const prompt = `🚀 News Alert: ${data.title} - ${data.content} 🔥 Rewrite this crypto news title in 15-20 words. Keep it short, catchy, and intriguing with trending hashtags. Don’t add extra explanations!`;
        if (!prompt) {
            return res.status(400).json({
                error: 'Prompt is required'
            });
        }

        const url = `http://172.16.3.166:3000/ask`;
        const payload = {
            prompt
        };
        const response = await axios.post(url, payload);
        if (response) {
            const data = response.data.response
            console.log(data);
            try {
                await safeTweet(twitterClient, data);
            } catch (error) {
                console.error('Final error:', error);
            }
        } else {

            console.error("Unexpected response format");
        }

    } catch (err) {
        console.error(err);
    }
};