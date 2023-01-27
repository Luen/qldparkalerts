const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const alertURLBase = "https://parks.des.qld.gov.au/park-alerts/";
const feedsURLBase = "https://parks.des.qld.gov.au/xml/rss/";
const feed = "parkalerts.xml";
const filename = "qld-park-alerts";
const file = filename + ".json";

(async () => {
    try {
        const requestUrl = feedsURLBase + feed;
        const response = await axios.get(requestUrl);
        const $ = cheerio.load(response.data, {
            xmlMode: true
        });
        const results = $("channel");

        const filename = "qld-park-alerts";
        const file = `${filename}.json`;

        if (fs.existsSync(file)) {
            const f = JSON.parse(fs.readFileSync(file));
            if (
                results.find("lastBuildDate").text() === f.lastBuildDate &&
                results.find("pubDate").text() === f.pubDate
            ) {
                console.log("Already up-to-date");
            }
        }

        const jsonAlerts = {
            title: results.find("title").text(),
            link: results.find("link").text(),
            description: results.find("description").text(),
            pubDate: results.find("pubDate").text(),
            lastBuildDate: results.find("lastBuildDate").text(),
            language: results.find("language").text(),
            ttl: results.find("ttl").text(),
            alerts: []
        };

        results.find("item").each((i, alert) => {
            const $ = cheerio.load(alert, {
                xmlMode: true
            });
            const id = $("link").text().split("/").pop();
            console.log(id);
            axios
                .get(`${alertURLBase}${id}`)
                .then(response => {
                    const $ = cheerio.load(response.data);
                    const element = $("div#park-alert");


                    const title = element.find("h1").text();
                    const link = element.find("link").text();
                    const guid = element.find("guid").text();
                    const v = guid.split("?v=").pop();
                    const pubDate = element.find("pubDate").text();
                    const closure = element
                        .find("p.closure")
                        .text()
                        .trim()
                        .replace(/\s+/g, " ");
                    const parkAlertObj = JSON.parse(
                        element
                        .find('script:contains("parkAlertObj")')
                        .text()
                        .replace("var parkAlertObj = ", "")
                        .replace(/;\n/, "")
                        .trim()
                    );
                    const selectedParks = {};
                    parkAlertObj.selectedParksArray.forEach(selectedPark => {
                        const {
                            id,
                            name,
                            region,
                            url,
                            longLat
                        } = selectedPark;
                        selectedParks[id] = {
                            name,
                            region,
                            url,
                            longLat
                        };
                    })
                })
        })

        fs.writeFileSync(file, JSON.stringify(jsonAlerts));
    } catch (err) {
        console.log(err)
    }
})();