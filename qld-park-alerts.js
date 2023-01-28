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
    // Check to see if the XML is updated
    if (fs.existsSync(file)) {
      const f = JSON.parse(fs.readFileSync(file));
      if (results.find("lastBuildDate").text() === f.lastBuildDate && results.find("pubDate").text() === f.pubDate) {
        console.log("Already up-to-date");
        return;
      }
    }
    const jsonAlerts = {
      title: results.find("title").first().text(),
      link: results.find("link").first().text(),
      description: results.find("description").first().text(),
      pubDate: results.find("pubDate").first().text(),
      lastBuildDate: results.find("lastBuildDate").first().text(),
      language: results.find("language").first().text(),
      ttl: results.find("ttl").first().text(),
      alerts: []
    };
    new Promise(async (resolve, reject) => {
      await Promise.all(results.find("item").each(async (i, alert) => {
          const id = $(alert).find("link").text().split("/").pop(); //const id = results.find("item:nth-child("+i+")").find("link").text().split("/").pop();
          const response = await axios.get(`${alertURLBase}${id}`);
          const alert$ = cheerio.load(response.data);
          const element = alert$("div#park-alert");
          const title = element.find("h1").text();
          const link = element.find("link").text();
          const guid = element.find("guid").text();
          const v = guid.split("?v=").pop();
          const pubDate = element.find("pubDate").text();
          const closure = element.find("p.closure").text().trim().replace(/\s+/g, " ");
          const parkAlertObj = JSON.parse(element.find('script:contains("parkAlertObj")').text().replace("var parkAlertObj = ", "").replace(/;\n/, "").trim());
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
          let category = alert$('dl[class=attributes] dd', 0).text().replace(/\s+/g,' ').trim();
          let applies = alert$('dl[class=attributes] dd', 1).text().trim();
          let published = alert$('dl[class=attributes] dd', 2).text().trim();
          let updated = "";
          if (alert$('dl[class=attributes] dt', 3).text().toLowerCase().trim() === "updated:") {
            updated = alert$('dl[class=attributes] dd', 3).text().trim();
          }
          let description = alert$('div[id=park-alert] p[class=introduction]', 0).text().trim();
          let subdescription = alert$('div[id=park-alert] p[class=introduction]', 0).next().text().trim();
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
          if (i === results.find("item").length - 1) resolve();
        }))
      }).then(() => {
          fs.writeFileSync(file, JSON.stringify(jsonAlerts))
      });
  } catch (err) {
    console.log(err)
  }
})();