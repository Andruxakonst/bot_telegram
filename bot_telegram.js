const http = require('http');
const https = require('https');
const fs = require('fs');
const request = require('request');
//файл конфигурации 
const config = require('./config.json');

const hostname = config.hostname;
const port = config.port;
const inputPort = config.inputPort;

if(inputPort){inputPort = `:${inputPort}`};

const botWebhookURL = `https://${config.botUrlApi}${inputPort}/bot${config.botToken}/setWebhook?url=${config.inputUrl}/bot/${config.botToken}`;

//webhook connection
//отправить get запрос на botWebhookURL и если ответ ОК - запутить сервер 
https.get(botWebhookURL, (res)=>{
  res.on('data', (data) => {
    data = JSON.parse(data);
    if(data.ok && data.result){
      //console.log(`WebHook OK - runing incoming server`);
      log(`Server WebHook OK - runing incoming server`);
      console.log(`Server WebHook OK - runing incoming server`);
      inTelelegServer();
      service.postStart();

    }else{
      console.log(`webhook not Ok data:${data}`);
      log(`Server Webhook not Ok data:${data}`);
    }
  });
});

//сервер для получения данных
function inTelelegServer(){
  const server = http.createServer((req, res) => {
    
    //отсеиваем ненужные запросы и пути
    if(req.method == 'POST' && req.url ==`/bot/${config.botToken}`){
      req.on('data', (data) => {
        data = JSON.parse(data);
        res.statusCode = 200; //отвечаем ОК
        res.end('OK'); //отвечаем
        //отправляем принятое обновление 
        messHendler(data)
      });
      
    }else{
      //ловим запрос картинок
      if(req.url.includes(`/img/`)){
        //отдаем картинку если она есть.
        fs.readFile('.'+req.url, function (error, data) {
          if (error) {
            res.statusCode = 404;
            res.end('Resourse not found!');
          } else {
            res.statusCode = 200;
            res.end(data);
          };
        });

      }else{
        req.on('data', (data) => {
          //console.log(`левый запрос - URL:${req.url} method:${req.method} data:${data}`);
          log(`other request - URL:${req.url} method:${req.method} data:${data}`);
        });
        res.statusCode = 404; //отвечаем 404
        res.end('Not OK 404'); //отвечаем
      };
    };

    //если пришла ошибка
    req.on('error', (err) => {
      console.log(`Ошибка: ${err}`);
      log(`Incoming server error -  ${err}`);
      
    });

    //если соединение разорвано
    req.on('end', () => {
      //console.log(`Соединение закрыто`);
    });

  });

  server.listen(port, hostname, () => {
    log(`Incoming server run local - ${config.hostname}:${config.port} webhook- ${botWebhookURL}`);
    console.log(`Incoming server run`);
  });

};

function messHendler(update){
    //если есть start

  if("message" in update && "text" in update.message && update.message.text.indexOf('/start') == 0){ 
   // console.log(`отлов обработка старта`);
    //обработка команды старт 
    let chat_id = update.message.chat.id;
    let msg = {};
    msg.chat_id = chat_id;

    let str = update.message.text.split(' ');

    //преобразование строки контекста из base64 в JSON!!!

    if(str[1]){
      str = Buffer.from(str[1],'base64').toString(); //декодируем полученную строку после /start
      let context = JSON.parse(str);
        console.log(`получен контекст`)
        //сохраняем объект пользователя и строку в массив сервис-user
        //проверяем есть ли у нас такой объект user в массиве
        service.usersArr.find((el)=>{
           if(el.user_id == update.message.from.id){el = {}; console.log('Затер')}
        });
          service.usersArr.unshift({"user_id":update.message.from.id, "context":context});
          log(`user pushed - ${JSON.stringify(update.message.from)} string to Base64 ${JSON.stringify(context)} OK`);

    }else{
      str = 'нет данных после /start';
      log(`user - ${JSON.stringify(update.message.from)} string to Base64 empty ERR`);
    };

    //вернул расшифрованные данные
    msg.text = str; 
    //messsSend(msg); 
     //запрос номера телефона
      msg = {
        chat_id,
        "text":"Для регистрации нужен Ваш номер телефона! Отправте его при помощи кнопки 'Отправить номер телефона' ниже",
        "parse_mode": "HTML",
        "reply_markup": {
            "keyboard":
            [
                [{ text: 'Отправить номер телефона', request_contact: true }]
            ],
        "one_time_keyboard": true,
        "resize_keyboard": true,
        }
      };

     mesSend(msg); 
  }else{

    let msg;
    let chat_id;
    //console.log(`отлов есть ли message `,"message" in update);
    if("message" in update){ //проверяем есть ли свойство message in update

      chat_id = update.message.chat.id;
      msg = {chat_id, "text":`Если у вас открыта клавиатура, то кнопку "Отправить номер телефона" не будет видно. Чтобы показать её, нажмите на этот значок.`};
      
        if('text' in update.message){
          //mesSend(msg);
          sendPhoto(chat_id, 'tlg1.jpg',`Нажмите эту кнопку для отправки номера телефона.`);
          setTimeout(()=>{
            sendPhoto(chat_id, 'tlg2.jpg',`Если у вас открыта клавиатура, то кнопку "Отправить номер телефона" не будет видно. Чтобы показать её, нажмите на этот значок.`);
          },500);
        };

        if('entities' in update.message){
          //console.log(`Сущность`);
          msg.text = 'Не понимаю что это...';
          //mesSend(msg);
        };

        if('location' in update.message){
          //console.log(`ГЕО`);
          msg.text = 'Спасибо! Ваше местоположение получено.';
        };

        if('contact' in update.message){
          //console.log(`Контакт`);
          
          if(!update.message.contact.last_name){
            update.message.contact.last_name ='';
          }
          let phone = update.message.contact.phone_number;
          log(`contact - ${JSON.stringify(update.message.contact)}`);
          
          service.getTokenUrl(update.message.contact.user_id,phone).then((str)=>{
            log('Получение токена - str '+ JSON.stringify(str));
            msg = {
              "chat_id":update.message.chat.id,
              "text":`Спасибо, ${update.message.contact.last_name} ${update.message.contact.first_name}! Мы получили Ваш номер телефона. Теперь перейдите по ссылке ниже:
${str}`,
              "reply_markup": {
              "remove_keyboard":true,
              },
            };
            // если в ответе есть слово Ошибка то выводим это текст
            if(str.indexOf('Ошибка!') != -1){
              msg.text = str;
            };
          log(`contact send url to base64 - ${JSON.stringify(update.message.contact)} data in base64 - ${str}`);
          mesSend(msg);
          });
          
        };

    }else{
      //console.log(`отлов нет message`);
      if("my_chat_member" in update){
        //console.log(`отлов my_chat_member`, update);
        log(`fined my_chat_member in update - ${JSON.stringify(update)}`);
        chat_id = update.my_chat_member.chat.id;
        msg = {chat_id, "text":"Что-то пошло не так. Пожалуйста, вернитесь в приложение и повторите запрос."};
      }else{
        //console.log(`отлов мимо`, update);
        log(`not fined message in update - ${update}`);
      };

    };
    //делаем эхо
  };
};

function mesSend(mess){

  let data = JSON.stringify(mess);
  log(`Отправлен - ${data}`);

  const options = {
    hostname: config.botUrlApi,
    port: 443,
    path: `/bot${config.botToken}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(options, res => {
    //console.log(`statusCode: ${res.statusCode}`);

    res.on('data', d => {
      //process.stdout.write(d);
      
      d=JSON.parse(d.toString());
      log(`return telegram - ${res.statusCode} data - ${JSON.stringify(d)} text - ${mess.text}`);
    });

  });

  req.on('error', error => {
    log(`sendMessage status code - ${res.statusCode} error - ${error} text - ${mess.text}`);
    console.error('error',error)
  });

  req.write(data);
  req.end();
};

function sendPhoto(chat_id, fileName, caption){
  if(!caption){caption=''};
  msg = {chat_id, "photo":`${config.inputUrl}/img/${fileName}`,caption};
  let data = JSON.stringify(msg);
  log(`Отправлен - ${data}`);

  const options = {
    hostname: config.botUrlApi,
    port: 443,
    path: `/bot${config.botToken}/sendPhoto`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(options, res => {
    //console.log(`statusCode: ${res.statusCode}`);

    res.on('data', d => {
      //process.stdout.write(d);
      
      d=JSON.parse(d.toString());
      log(`return telegram images - ${res.statusCode} data - ${JSON.stringify(d)}`);
    });

  });

  req.on('error', error => {
    log(`sendMessage status code - ${res.statusCode} error - ${error} text - ${mess.text}`);
    console.error('error',error)
  });

  req.write(data);
  req.end();
};

let service = {
  usersArr:[],    //массив хранения телефонов и base64 строк
  servicesArr:[], //массив хранения сервисов

  postStart(){
    const options = {
      'method': 'POST',
      'url': config.servicesURL,
      'headers': {},
      formData: {}
    };
    reg(); //запускаем функцию что бы сразу получить данные при первом запуске
    
    function reg(){
      service.servicesArr = [];
      request({'method': 'POST','url': config.servicesURL,'headers': {},'form': {}}, function (error, response) {
        if (error) {
          console.log(error); 
          log(`Error get services. Error - ${error}`);
          response.body = `Error get services. Error - ${error}`;
        };
        let data = JSON.parse(response.body);
        //console.log(data.status);
        if(data && 'status' in data && data.status == 'ok'){
          data.data.forEach(element => service.servicesArr.push(element));
        }else{
          log(`error data in get services response - data - ${response.body}`);
        };
      });

      request({'method': 'POST','url': config.servicesURL,'headers': {},'form': {service_type: "delivery"}}, function (error, response) {
        if (error) {
          console.log(error); 
          log(`Error get services delivery. Error - ${error}`);
          response.body = `Error get services delivery. Error - ${error}`;
        };
        let data = JSON.parse(response.body);
        //console.log(data.status);
        if(data && 'status' in data && data.status == 'ok'){
          data.data.forEach(element => service.servicesArr.push(element));
        }else{
          log(`error data in get delivery response - data - ${response.body}`);
        };
      });
    };
    //save services to array _services every 5 minutes. Время интервала config.servicesGetInterval
    setInterval(reg,config.servicesGetInterval);

  },
  //функция получения ip:port from _services
  getIpPort(id){

    if(service.servicesArr.length>0 && id){
      let finded = service.servicesArr.find((el)=>{return el.firm_id == id});

      if(finded){
        return {"ip":finded.ip, "port":finded.port};
      }else{
        log(`не удалось нати фирму с id - ${id}`);
        return {"ip":'', "port":''};
      };
      
    }else{
      log(`Не удалось получить список фирм или значение id неизвестно. Количество фирм в массиве - ${service.servicesArr.length} ID- ${id}`);
      return {"ip":'', "port":''};
    };
    
  }, 
  async getTokenUrl(user_id, phone){

    if(service.usersArr.length>=200){service.usersArr.pop()}; //ограничиваем объем массива до 200 удаляя последний
    let findedUser = service.usersArr.find((el)=>{return el.user_id == user_id});//находим элемент с полученным user_id
    if(findedUser && `f` in findedUser.context && `s` in findedUser.context && `p` in findedUser.context){

      findedUser.phone = phone; //добавляем в объект номер телефона

      let context = findedUser.context;
      let firm_id = context.f;
      let service_id = context.s;
      let package_name = context.p;
      let serviceGet = service.getIpPort(firm_id); //получаем ip и port из для запроса токена
      let ipAdrr = serviceGet.ip;
      let port = serviceGet.port;
      let URLfullTokenGet = `http://${ipAdrr}:${port}`+config.getTokenURL;
      

      //Проверяем, все ли необходимые даные есть для запроса токена
      
      if(!ipAdrr =='' && !port =='' && !phone =='' && !firm_id =='' && !service_id =='' && !package_name ==''){

        let getidToken = new Promise((resolve, reject) => {

          //запрос на получение токена
          let options = {
            'method': 'POST',
            'url': URLfullTokenGet,
            'headers': {},
            formData: {
              'login': phone,
              'id_firm': firm_id,
              'service': service_id,
              'package_name': package_name,
              'bot_name': 'telegram',
              'sign': config.getTokenSign,
            }
          };
          log(`Send data for get token - ${JSON.stringify(options.formData)}`);
          //console.log(`Отправлены данные для получения токена`, options.formData);
          request(options, function (error, response) {
            if (error) throw new Error(error);
            let data = JSON.parse(response.body);

            if(data &&'status' in data && data.status == 'ok'){
            
              //заменить на полученный
              let token = data.data;
              //кодируем инфу в base64
              let token_phone = {"token":token, "phone":'+'+phone};
              let buf = Buffer.from(JSON.stringify(token_phone));
              let url = `${config.redirectURL}?data=${buf.toString('base64')}`;   
              log(`Token for user ${JSON.stringify(findedUser)} successfully received`);
              resolve(url);
            }else{
              log(`error getting token  ${JSON.stringify(options.formData)} for user - ${JSON.stringify(findedUser)} URL - ${URLfullTokenGet} req - ${JSON.stringify(data)}`);
              console.log(`req else`,data);
              resolve(`Ошибка! Что-то пошло не так. Пожалуйста, попробуйте еще раз. Если ошибка повторится, обратитесь в техническую поддержку. Приносим извинения за доставленные неудобства.`);
            };

          });

        });

        return await getidToken;

      }else{
        log(`get token error Не хватает элементов для запроса URLfullTokenGet ${URLfullTokenGet}  phone ${phone} firm_id ${firm_id} service_id ${service_id} package_name ${package_name}`);
        return `Ошибка! Что-то пошло не так. Пожалуйста, попробуйте еще раз. Если ошибка повторится, обратитесь в техническую поддержку. Приносим извинения за доставленные неудобства.`;
        
      };
      

    }else{
      log(`Don't fined element in ${user_id} service.usersArr findedUser - ${findedUser}`);
      log(`service.usersArr -  ${JSON.stringify(service.usersArr)} user_id - ${user_id} findedUser ${findedUser}`);
      return 'Ошибка! Не удалось найти Ваш id в массиве даных. Если ошибка повторяется, обратитесь в службу технической поддержки!';
    };
    
  }
};

//записать в файл
function log(str){
  if(config.logInconsole){console.log(str)};
  if(config.logInFile){ //проверяем переменную для записи в конфиг файле
    let dateNow = new Date(Date.now());
    let dateNowStr = `${dateNow.getFullYear()}-${dateNow.getMonth()+1}-${dateNow.getDate()} ${dateNow.getHours()}:${dateNow.getMinutes()}:${dateNow.getSeconds()}`
    fs.appendFile(config.puthToLog+config.logFileName,`${dateNowStr} ${str} \n`, err=>{
        if(err) {
            return false;
            throw err;
        }else{
            //console.log(str);
            return true;
        };  
    });
  };
};