const puppeteer = require('puppeteer');
const fs = require('fs');
const htmlToJson = require('html-to-json');

folder ="scraped_tweets";
scraped_tweets_folder = "scraped_tweets";
oldposts = "oldscraped";
path = "./"+folder;
//written as an arg @presswurstabervegan replace these with your own dataPath and chromePath

dataPath = '--user-data-dir=~/Library/Application\ Support/Google/Chrome';
chromePath = '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome';

if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
}
function getRandomTime() {
    return Math.floor(Math.random() * (100 - 50 + 1)) + 50;
}

async function run(all=false) {
    let browser;
    path = "./../"+folder
    
    if (!fs.existsSync("./gemini-puppeteer/scrapinglist")) {
        fs.writeFileSync("./gemini-puppeteer/scrapinglist", '')
    }

    const users = fs.readFileSync("./gemini-puppeteer/scrapinglist", 'utf8').split('\n').filter(Boolean);
        
    browser = await puppeteer.launch({
        headless: false,
        executablePath: chromePath,
        ignoreDefaultArgs: ["--enable-automation"],
        args: [
            dataPath,
        ],
    });

    const page = await browser.newPage();

    for (let user of users) {
        console.log("user",user);
        username = user.trim();
        const url = `https://x.com/${username}`;

        await page.goto(url, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle2']
        });
        //READ OLD USER POSTS
        const filepath = `./${scraped_tweets_folder}/${oldposts}/`;
        //onsole.log(filepath.replace(/\//g, require('path').sep));
        const files = fs.readdirSync(filepath);
        const userFiles = files.filter(f => f.startsWith(`${username}`));
        jsonData = {}
        jsonData.texts = [];
        jsonData.photos = [];


        console.log('')
        if (userFiles.length === 0) {
            console.log(`No files found in ${filepath} that start with ${username}`);
            //console.log("Creating a new storeData")
        }else{
            userFiles.forEach(file => {
                console.log(`Found file: ${filepath}/${file}`);
                const data = fs.readFileSync(`${filepath}/${file}`, 'utf8');
                const rjsonData = JSON.parse(data);
                jsonData.texts.push(rjsonData.text)
                jsonData.photos.push(rjsonData.photo)
            });
        };
         
        //console.log(jsonData)
        await new Promise(resolve => setTimeout(resolve, 500+getRandomTime()));

        const cellInnerDivs = await page.$$eval('div[data-testid="cellInnerDiv"]', divs => divs.map(div => div.innerHTML));
        for (const divContent of cellInnerDivs) {
            
            //console.log('storedData',jsonData);
            //console.log("start");

            let mjson = await htmlToJson.parse(divContent,
                {
                description: function ($doc) {

                    return $doc.find('div [data-testid="socialContext"]').text().normalize('NFKC');
                },
                text: function ($doc) {

                    mtext= $doc.find('div [data-testid="tweetText"]').text().normalize('NFKC');              
                    return mtext
                },    
                photo: function ( $doc ){
                    photos = $doc.find('div [data-testid="tweetPhoto"]').html();

                    if(photos){
                        photos = $doc.find('div [data-testid="tweetPhoto"]').find('img').attr('src');
                        return  photos };
                    return null        
                },
                video:  function ( $doc) {
                    videoHTML =  $doc.find('video').html();

                    if(videoHTML){
                        videoHTML = $doc.find('source[type="video/mp4"]').attr('src');
                        return videoHTML
                    }
                    return null
                },
                link: function ($doc) {
                    datagroup = $doc.find('div[role="group"] a[role="link"]').attr('href');

                    if(datagroup){
                        datagroup = datagroup.replace(/\/analytics/, '');
                        datagroup = `https://www.x.com${datagroup}`;
                        return datagroup
                    }
                    return null    
                },
            
            });

            if( mjson.text){
                if (!jsonData.texts.includes(mjson.text)) {
                    console.log("This is a new file");
                    let tweet = JSON.stringify(mjson, null, 2, 'utf-8');
                    path = "./"+folder
                    let filePath = `${path}/${username}_tweet_${Date.now()}.json`;
                    fs.writeFileSync(filePath, tweet,'utf-8');
                    console.log(tweet)
                    console.log(`Saved tweet to ${filePath}`); 
                } else {
                    console.log("This is already on the list");
                }
            };                       
        };
        
        await new Promise(resolve => setTimeout(resolve, 500));        
    }
    console.log('**FINISHED**');
    browser.close()
}
// Get the prompt from command-line arguments

async function main() {
    await run(); 
}

main();