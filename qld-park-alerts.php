<?php
//ini_set('memory_limit', '1024M');

/*$feeds = array(
  "Brisbane"=>"parkalerts-brisbane.xml",
  "Bundaberg"=>"parkalerts-bundaberg.xml",
  "Capricorn"=>"parkalerts-bundaberg.xml",
  "Fraser Coast"=>"parkalerts-fraser-coast.xml",
  "Gladstone"=>"parkalerts-gladstone.xml",
  "Gold Coast"=>"parkalerts-gold-coast.xml",
  "Mackay"=>"parkalerts-mackay.xml",
  "Outback Queensland"=>"parkalerts-outback-queensland.xml",
  "Southern Queensland Country"=>"parkalerts-southern-queensland-country.xml",
  "Sunshine Coast"=>"parkalerts-sunshine-coast.xml",
  "Townsville"=>"parkalerts-townsville.xml",
  "Tropical North Queensland"=>"parkalerts-tropical-north-queensland.xml",
  "Whitsundays"=>"parkalerts-whitsundays.xml"
);
foreach($feeds as $region=>$feed) {
}
*/

$alertURLBase = "https://parks.des.qld.gov.au/park-alerts/";

$feedsURLBase = "https://parks.des.qld.gov.au/xml/rss/";
$feed = "parkalerts.xml";

$requestUrl = $feedsURLBase.$feed;
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $requestUrl);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($curl);
curl_close($curl);

if ($response) {
  $results = simplexml_load_string($response);

  $filename = "qld-park-alerts";
  $file = $filename.".json";
  //check if up-to-date
  if (file_exists($file)) {
    $f = json_decode(file_get_contents($file));
    //die((string)$results->channel->lastBuildDate."<br>".$f->lastBuildDate."<br>".(string)$results->channel->pubDate."<br>".$f->pubDate."<br>");
    if ((string)$results->channel->lastBuildDate == $f->lastBuildDate && (string)$results->channel->pubDate == $f->pubDate) {
      die('Already up-to-date');
    }
  }

  $jsonAlerts = array(
    'title'=>(string)$results->channel->title,
    'link'=>(string)$results->channel->link,
    'description'=>(string)$results->channel->description,
    'pubDate'=>(string)$results->channel->pubDate,
    'lastBuildDate'=>(string)$results->channel->lastBuildDate,
    'language'=>(string)$results->channel->language,
    'ttl'=>(string)$results->channel->ttl,
    'alerts'=>array()
  );

  //require_once('./simple_html_dom.php');
  require_once('/srv/users/serverpilot/apps/maps/public/simple_html_dom.php');
  foreach($results->channel->item as $alert) {
    $id = basename($alert->link);
    $html = file_get_html($alertURLBase.$id);
    $element = $html->find('div[id=park-alert]',0);

    $title = (string)$alert->title;
    $link = (string)$alert->link;
    $guid = (string)$alert->guid;
    $v = substr($guid, strpos($guid, '?v=')+3);
    $pubDate = (string)$alert->pubDate;
    $title = strip_tags($element->find('h1',0));
    $closure = preg_replace('/\s+/', ' ',trim(strip_tags($element->find('p[class=closure]',0))));
    $parkAlertObj = json_decode(str_replace(";","",str_replace("var parkAlertObj = ","",trim(strip_tags($element->find('script',0))))));
    $selectedParks = array();
    foreach($parkAlertObj->selectedParksArray as $selectedPark) {
      $parkid = $selectedPark->id;
      $parkname = $selectedPark->name;
      $parkregion = $selectedPark->region;
      $parkurl = $selectedPark->url;
      $parklongLat = $selectedPark->longLat;
      //echo $selectedPark->campgrounds."<br>\n";
      //echo $selectedPark->journeys."<br>\n";
      //echo $selectedPark->attractions."<br>\n";
      //echo $selectedPark->journeys."<br>\n";
      $selectedParks[$parkid] = array(
        "name"=>$parkname,
        "region"=>$parkregion,
        "url"=>$parkurl,
        "longLat"=>$parklongLat
      );
    }
    $category = strip_tags($element->find('dl[class=attributes] dd',0));  //Category
    $applies = trim(strip_tags($element->find('dl[class=attributes] dd',1)));  //Applies
    $published = strip_tags($element->find('dl[class=attributes] dd',2));  //Published
    $updated = "";
    if (strtolower(trim(strip_tags($element->find('dl[class=attributes] dt',3)))) == "updated:") {
      $updated = strip_tags($element->find('dl[class=attributes] dd',3));  //Updated
    }
    //$alertid = echo strip_tags($element->find('dl[class=attributes] dd',3))."<br>\n\n";  //ID
    /*
    foreach($element->find('div[class=parks] div ul li') as $park) {
      echo $park->attr['data-id']."<br>\n\n";
      echo $park->find('a',0)->attr['href']."<br>\n\n";
      echo strip_tags($park->find('a',0))."<br>\n\n";
      echo strip_tags($park->find('span[class=region]',0))."<br>\n\n";
    }
    */
    $description = strip_tags($html->find('div[id=park-alert] p[class=introduction]',0));
    $subdescription = strip_tags($html->find('div[id=park-alert] p[class=introduction]',0)->next_sibling()); //needs work

    $jsonAlerts['alerts'][$id] = array(
      'title'=>$title,
      'description'=>$description,
      'subdescription'=>$subdescription, // needs work
      'category'=>$category,
      'link'=>$link,
      'guid'=>$guid,
      'version'=>$v,
      //'pubDate'=>$pubDate,
      'published'=>$published,
      'updated'=>$updated,
      'applies'=>$applies,
      'closure'=>$closure,
      'appliesTo'=>$selectedParks
    );
  }

  print_r(json_encode($jsonAlerts));
  file_put_contents($file,json_encode($jsonAlerts));

  // via AlertsID  //DONE




  die();


/*
  // via Park
  $filePark = $filename."-park.json";
  // via Region
  $fileRegion = $filename."-region.json";
  // via Locaiton
  $fileLocation = $filename."-coordinates.json";

  $jsonParks = array();
  $jsonRegion = array();
  $jsonCoordinates = array();
  foreach($jsonAlerts['alerts'] as $key=>$alert) {
    foreach($jsonAlerts['alerts'][$key]['appliesTo'] as $k=>$p) {
      $parkId = $k;
      $parkName = $p[$k]['name'];
      $region = $p[$k]['region'];
      $coordinates = $p[$k]['$longLat'];

      if (!$parksJson[$parkId]) {
        $parksJson[$parkId] = array(
          'parkName'=>$parkName,
          'id'=>array(),
        );
        if (!in_array($key,$parksJson[$parkId]['id'])) {
          array_push($parksJson[$parkId]['id'],$key);
        }
      }
      if (!$parksJson[$region]) {
        $jsonRegion[$region] = array();
        if (!in_array($key,$parksJson[$region])) {
          array_push($parksJson[$region],$key);
        }
      }
      if (!$parksJson[$coordinates]) {
        $jsonCoordinates[$coordinates] = array();
        if (!in_array($key,$parksJson[$coordinates])) {
          array_push($parksJson[$coordinates],$key);
        }
      }
    }
  }
  file_put_contents($filePark,json_encode($jsonParks));
  file_put_contents($jsonRegion,json_encode($jsonRegion));
  file_put_contents($jsonCoordinates,json_encode($jsonCoordinates));
  print_r($jsonParks);
  print_r($jsonRegion);
  print_r($jsonCoordinates);*/



}

?>
