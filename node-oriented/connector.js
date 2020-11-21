/**
 * @description Session controller
 * based on native webSocket server/client.
 * Supported with mongoDB database platform.
 */
const fs = require("fs");
const shared = require("./common/shared");
const static = require("node-static");
const CryptoHandler = require("./common/crypto");
var file = new static.Server("./public");

class Connector {
  constructor(serverConfig) {
    var root = this;

    this.userSockCollection = {};
    this.config = serverConfig;
    this.http = null;
    this.crypto = new CryptoHandler();

    if (!serverConfig.isSecure) {
      let options = {
        key: fs.readFileSync(serverConfig.certPathSelf.pKeyPath),
        cert: fs.readFileSync(serverConfig.certPathSelf.pCertPath),
        ca: fs.readFileSync(serverConfig.certPathSelf.pCBPath)
      };

      this.http = require("https")
        .createServer(options, function(request, response) {
          // Prevent with end here...
          request
            .addListener("end", function() {
              if (request.url.search(/.png|.gif|.js|.css/g) == -1) {
                response.statusCode = 200;
                response.write("no no");
                return response.end();
                // file.serveFile(root.config.specialRoute.default, 402, {}, request, response);
              } else file.serve(request, response);
            })
            .resume();
        })
        .listen(serverConfig.getConnectorPort);
    } else {
      let options = {
        key: fs.readFileSync(serverConfig.certPathProd.pKeyPath),
        cert: fs.readFileSync(serverConfig.certPathProd.pCertPath),
        ca: fs.readFileSync(serverConfig.certPathProd.pCBPath)
      };

      this.http = require("https")
        .createServer(options, function(request, response) {
          request
            .addListener("end", function() {
              if (request.url.search(/.png|.gif|.js|.css/g) == -1) {
                response.statusCode = 200;
                response.write("No access on this way man.");
                return response.end();
              } else file.serve(request, response);
            })
            .resume();

          /* request.addListener('end', function() {
          if (request.url.search(/.png|.gif|.js|.css/g) == -1) {
            file.serveFile("app.html" , 404, {}, request, response);
          } else file.serve(request, response);
        }).resume();
        */
        })
        .listen(serverConfig.getConnectorPort);
    }

    /**
     * Create main webSocket object
     */
    let WebSocketServer = require("websocket").server;
    this.wSocket = new WebSocketServer({
      httpServer: this.http,
      autoAcceptConnections: false,
      keepalive: true,
      keepaliveGracePeriod: 100000,
      keepaliveInterval: 40000,
      maxReceivedFrameSize: 131072,
      maxReceivedMessageSize: 10 * 1024 * 1024,
    }).on("request", this.onRequestConn);
    WebSocketServer = null;

    if (this.config.IsDatabaseActive) {
      let MyDatabase = require("./database/database");
      this.database = new MyDatabase(this.config);
      MyDatabase = null;
    }

    shared.myBase = this;
    shared.serverHandlerRegister = this.serverHandlerRegister;
    shared.serverHandlerRegValidation = this.serverHandlerRegValidation;
    shared.serverHandlerLoginValidation = this.serverHandlerLoginValidation;
    shared.serverHandlerGetUserData = this.serverHandlerGetUserData;
    shared.serverHandlerSetNewNickname = this.serverHandlerSetNewNickname;
    shared.serverHandlerFastLogin = this.serverHandlerFastLogin;
    shared.serverHandlerGamePlayStart = this.serverHandlerGamePlayStart;
    shared.serverHandlerSessionLogOut = this.serverHandlerSessionLogOut;
    shared.serverHandlerOutOfGame = this.serverHandlerOutOfGame;
    // UPGRADE
    shared.serverHandlerGetUsersList = this.serverHandlerGetUsersList;
    shared.serverHandlerTryThisUser = this.serverHandlerTryThisUser;
    shared.serverHandlerCallReject = this.serverHandlerCallReject;
    shared.serverHandlerProfilePhoto = this.serverHandlerProfilePhoto;
  }

  sendData(message, websocket) {
    if (message instanceof String) {
      console.error("Connector.sendData : Message can't be type of string.", message);
      return;
    }

    message.data = JSON.stringify(message.data);

    if (!message) {
      console.error("message no exists!");
      return;
    }

    try {
      websocket.sendUTF(message.data);
    } catch (err) {
      console.error("Error in Connector.sendData", err);
    }
  }

  onRequestConn(socket) {
    const origin = socket.origin + socket.resource;
    let userSocket = socket.accept(null, origin);
    // console.log("Controller session is up. resource tag is: ", socket.resource);

    /**
     * Server message event
     */
    userSocket.on("message", function(message) {
      if (message.type === "utf8") {
        try {
          let msgFromCLient = JSON.parse(message.utf8Data);
          // console.warn("On message, utf8Data passed... ", msgFromCLient.data);

          if (typeof msgFromCLient.data === "string") {
            /**
             * Passed simple string is not my case
             * Use for some custom non secure data flow.
             */
            // console.log("ignore, this is just welcome message : " + msgFromCLient.data);

            this.send(JSON.stringify({ action: "ignore", data: "Welcome here !" }));
          } else {
            /**
             * Network Actions parsed here:
             */
            if (msgFromCLient.action) {
              if (msgFromCLient.action === "REGISTER") {
                const userId = shared.formatUserKeyLiteral(msgFromCLient.data.userRegData.email);
                shared.myBase.userSockCollection[userId] = this;
                msgFromCLient.data.socketId = userId;
                console.log(msgFromCLient.data.socketId + ":::msgFromCLient.data.socketId");
                shared.serverHandlerRegister(msgFromCLient);
              } else if (msgFromCLient.action === "REG_VALIDATE") {
                shared.serverHandlerRegValidation(msgFromCLient);
              } else if (msgFromCLient.action === "LOGIN") {
                const userId = shared.formatUserKeyLiteral(msgFromCLient.data.userLoginData.email);
                shared.myBase.userSockCollection[userId] = this;
                shared.serverHandlerLoginValidation(msgFromCLient);
              } else if (msgFromCLient.action === "GET_USER_DATA") {
                shared.serverHandlerGetUserData(msgFromCLient);
              } else if (msgFromCLient.action === "NEW_NICKNAME") {
                shared.serverHandlerSetNewNickname(msgFromCLient);
              } else if (msgFromCLient.action === "FLOGIN") {
                const userId = shared.formatUserKeyLiteral(msgFromCLient.data.userLoginData.email);
                shared.myBase.userSockCollection[userId] = this;
                shared.serverHandlerFastLogin(msgFromCLient);
              } else if (msgFromCLient.action === "GAMEPLAY_START") {
                shared.serverHandlerGamePlayStart(msgFromCLient);
              } else if (msgFromCLient.action === "LOG_OUT") {
                shared.serverHandlerSessionLogOut(msgFromCLient);
              } else if (msgFromCLient.action === "OUT_OF_GAME") {
                shared.serverHandlerOutOfGame(msgFromCLient);
              } else if (msgFromCLient.action === "GET_USERS_LIST") {
                /**
                 * UPGRADES
                 */
                shared.serverHandlerGetUsersList(msgFromCLient);
              } else if (msgFromCLient.action === "CALL_REQUEST") {
                shared.serverHandlerTryThisUser(msgFromCLient);
              } else if (msgFromCLient.action === "CALL_REQUEST_REJECTED") {
                shared.serverHandlerCallReject(msgFromCLient);
              } else if (msgFromCLient.action === "UPLOAD_PROFILE_PHOTO") {
                shared.serverHandlerProfilePhoto(msgFromCLient);
              }
            } else {
              console.warn("Object but not action in it.");
            }
          }
        } catch (err) {
          console.warn("On message : Message is simple string", err);
        }
      }
    });

    userSocket.on("close", function(e) {
      console.warn("Event: onClose");
    });

    userSocket.on("error", function(e) {
      console.warn("Event: error");
    });

    console.log("onRequestConn constructed.");
  }

  serverHandlerRegister(regTest) {
    // validate
    if (regTest.data.userRegData) {
      if (shared.validateEmail(regTest.data.userRegData.email) === null) {
        shared.myBase.database.register(regTest.data, shared.myBase);
      }
    }
  }

  onRegisterResponse(result, userEmail, uniq, socketId, callerInstance) {
    let connection;
    let userId = shared.formatUserKeyLiteral(userEmail);
    console.log("onRegisterResponse : " + result + ". For user: " + userEmail);
    if (result == "USER_REGISTERED") {
      let emailRegBody = require("./email/templates/confirmation.html").getConfirmationEmail;
      let contentRegBody = emailRegBody(uniq, userEmail);

      try {
        connection = require("./email/mail-service")(userEmail, "USER_REGISTERED", contentRegBody).SEND(userEmail);
      } catch (error) {
        console.warn("Connector error in sending reg email!", error);
        let codeSended = {
          action: "ERROR_EMAIL",
          data: { errMsg: "Please check your email again!, Something wrong with current email!" }
        };
        codeSended = JSON.stringify(codeSended);
        callerInstance.userSockCollection[socketId].send(codeSended);
        console.log("Email reg error. Notify client.");
      } finally {
        connection.then(function(data) {
          let codeSended = {
            action: "CHECK_EMAIL",
            data: {
              accessToken: socketId,
              text: "Please check your email to get verification code. Paste code here :"
            }
          };
          codeSended = JSON.stringify(codeSended);
          callerInstance.userSockCollection[socketId].send(codeSended);
          console.log("Email reg sended. Notify client.");
        });
      }
    } else {
      // handle this...
      console.warn("Something wrong with your email. Result is : ", result);
      let msg = { action: "ERROR_EMAIL", data: { errMsg: "ERR: USER ALREADY REGISTERED" } };
      msg = JSON.stringify(msg);
      callerInstance.userSockCollection[socketId].send(msg);
      console.log("Email reg error. Notify client.");
    }
  }

  serverHandlerRegValidation(register) {
    if (register.data.userRegToken && register.data.email) {
      const user = { email: register.data.email, token: register.data.userRegToken, accessToken: register.data.accessToken };
      shared.myBase.database.regValidator(user, shared.myBase);
    }
  }

  onRegValidationResponse(result, userEmail, accessToken) {
    console.log("test 3 VERIFY_SUCCESS accessToken", accessToken);
    if (result == null) {
      let msg = { action: "ERROR_EMAIL", data: { errMsg: "ERR: WRONG CODE!" } };
      msg = JSON.stringify(msg);
      this.userSockCollection[accessToken].send(msg);
      console.log("onRegValidationResponse .", this);
    } else {
      // VERIFIED
      let msg = { action: "VERIFY_SUCCESS", data: { text: "VERIFY SUCCESS! PLEASE LOGIN " } };
      msg = JSON.stringify(msg);
      this.userSockCollection[accessToken].send(msg);
      console.log("onRegValidationResponse .", this);
    }
  }

  serverHandlerLoginValidation(login) {
    const user = { email: login.data.userLoginData.email, password: login.data.userLoginData.password };
    shared.myBase.database.loginUser(user, shared.myBase);
  }

  onUserLogin(user, callerInstance) {
    let userId = shared.formatUserKeyLiteral(user.email);
    try {
      let codeSended = { action: "ONLINE", data: { accessToken: userId, text: "Welcome to the game portal.", user } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[userId].send(codeSended);
      console.warn("Online : ", user.email);
    } catch (err) {
      console.log("Something wrong with onUserLogin :: userSockCollection[userId]. Err :", err);
    }
  }

  serverHandlerGetUserData(user) {
    try {
      shared.myBase.database.getUserData(user, shared.myBase);
    } catch (err) {
      console.log("Connector.serverHandlerGetUserData error : ", err);
    }
  }

  onUserData(user, callerInstance) {
    try {
      let userId = shared.formatUserKeyLiteral(user.email);
      let codeSended = { action: "GET_USER_DATA", data: { user } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[userId].send(codeSended);
    } catch (err) {
      console.log("Something wrong with onUserData :: userSockCollection[userId]. Err :", err);
    }
  }

  serverHandlerSetNewNickname(arg) {
    if (arg !== undefined) {
      console.log(arg);
      shared.myBase.database.setNewNickname(arg, shared.myBase);
    }
  }

  serverHandlerFastLogin(arg) {
    if (arg !== undefined) {
      console.log(arg);
      shared.myBase.database.fastLogin(arg, shared.myBase);
    }
  }

  onUserNewNickname(userData, callerInstance) {
    try {
      let userId = shared.formatUserKeyLiteral(userData.email);
      let codeSended = { action: "NICKNAME_UPDATED", data: { userData } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[userId].send(codeSended);
    } catch (err) {
      console.log("Something wrong with :: userSockCollection[userId]. Err :", err);
    }
  }

  serverHandlerGamePlayStart(arg) {
    if (arg !== undefined) {
      console.log(arg.activeGame);
      shared.myBase.database.platformerActiveUsers.addActiveGamePlayer(arg, shared.myBase);
    }
  }

  serverHandlerSessionLogOut(arg) {
    if (arg !== undefined) {
      console.log(arg);
      shared.myBase.database.logOut(arg, shared.myBase);
    }
  }

  serverHandlerOutOfGame(arg) {
    if (arg !== undefined) {
      shared.myBase.database.platformerActiveUsers.removeActiveGamePlayer(arg, shared.myBase);
    }
  }

  serverHandlerGetUsersList(arg) {
    try {
      shared.myBase.database.getUsersList(arg, shared.myBase);
    } catch (err) {
      console.log("Connector.serverHandlerGetUsersList error : ", err);
    }
  }

  serverHandlerTryThisUser(arg) {
    try {
      shared.myBase.database.tryUser(arg, shared.myBase);
    } catch (err) {
      console.log("Connector.serverHandlerTryThisUser error : ", err);
    }
  }

  serverHandlerCallReject(arg) {
    shared.myBase.database.callRejectUser(arg, shared.myBase);
  }

  serverHandlerProfilePhoto(arg) {
    shared.myBase.database.saveProfileImageAddress(arg, shared.myBase);
  }

  onCallRejected(userData, callerInstance) {
    try {
      let codeSended = { action: "CALL_REQUEST_REJECTED", data: { data: userData } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[userData.accessToken].send(codeSended);
    } catch (err) {
      console.log("Connector.onCallRejected error : ", err);
    }
  }

  /** UPGRADE */
  onSteamPublicUsers(user, callerInstance, usersData) {
    try {
      let codeSended = { action: "USER_LIST", data: { data: usersData } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[user.data.accessToken].send(codeSended);
    } catch (err) {
      console.log("Something wrong with :: userSockCollection[userId]. Err :", err);
    }
  }

  onTryUserCallByNickname(userData, callerInstance) {
    try {
      let codeSended = { action: "CALL_REQUEST_MSG", data: { data: userData } };
      codeSended = JSON.stringify(codeSended);
      console.log(">> ", userData);
      callerInstance.userSockCollection[userData.accessToken].send(codeSended);
    } catch (err) {
      console.log("Something wrong with :: userSockCollection[userId]. Err :", err);
    }
  }

  onUserNewProfileImage(userData, callerInstance) {
    try {
      let codeSended = { action: "NEW_PROFILE_PHOTO", data: { userData } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[userData.accessToken].send(codeSended);
    } catch (err) {
      console.log("Something wrong with :: userSockCollection[userId]. in NEW_PROFILE_PHOTO  Err :", err);
    }
  }

  onLogOutResponse(userData, callerInstance) {
    try {
      let userId = shared.formatUserKeyLiteral(userData.email);
      let codeSended = { action: "LOG_OUT", data: { userData } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[userId].send(codeSended);
    } catch (err) {
      console.log("Something wrong with :: userSockCollection[userId]. Err :", err);
    }
  }

  onOutOfGameResponse(userData, callerInstance) {
    try {
      let userId = shared.formatUserKeyLiteral(userData.email);
      let codeSended = { action: "OUT_OF_GAME", data: { userData } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[userId].send(codeSended);
    } catch (err) {
      console.log("Something wrong with :: userSockCollection[userId]. Err :", err);
    }
  }

  onGameStartResponse(userData, callerInstance) {
    try {
      let userId = shared.formatUserKeyLiteral(userData.email);
      let codeSended = { action: "GAMEPLAY_STARTED", data: { userData } };
      codeSended = JSON.stringify(codeSended);
      callerInstance.userSockCollection[userId].send(codeSended);
    } catch (err) {
      console.log("Something wrong with :: userSockCollection[userId]. Err :", err);
    }
  }
}
module.exports = Connector;
