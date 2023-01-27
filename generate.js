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
                //return;
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
                                        
                    let category = $('dl[class=attributes] dd',0).text();
                    let applies = $('dl[class=attributes] dd',1).text().trim();
                    let published = $('dl[class=attributes] dd',2).text();
                    let updated = "";
                    if ($('dl[class=attributes] dt',3).text().toLowerCase().trim() === "updated:") {
                        updated = $('dl[class=attributes] dd',3).text().trim();
                    }

                    let description = $('div[id=park-alert] p[class=introduction]',0).text().trim();
                    let subdescription = $('div[id=park-alert] p[class=introduction]',0).next().text().trim();

                  jsonAlerts.alerts.push({
                                title: title,
                                description: description,
                                subdescription: subdescription,
                                category: category,
                                link: link,
                                guid: guid,
                                version: v,
                                published: published,
                                updated: updated,
                                applies: applies,
                                closure: closure,
                                appliesTo: selectedParks
                    })
                })
        }).then(() => {
          fs.writeFileSync(file, JSON.stringify(jsonAlerts))
      });
        
    } catch (err) {
        console.log(err)
    }
})();