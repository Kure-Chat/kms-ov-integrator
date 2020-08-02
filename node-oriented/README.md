
# Application based on:                     #

 - <b> kurento media server KMS project        </b>
 - <b> openvidu server/tutorials project       </b>
 - <b> connector.js from visual-ts-game-engine </b>


## kms-ov-account-integrator ##

 - Middleware server base done node.js.
   This our security middleware server between KMS-OC and
 - Protocol http2 used.
 - Public server: 159.89.8.40
   https://maximumroulette.com
 - Last containner id: 6cfadd6d2605
 - Recording folder (host) : "/var/applications/kurento-project/rec"


## Instructions for running docker KMS-OV servers ##

#### Internal data (help) ####

Install nodejs with yum:
```js
 sudo yum install -y nodejs OR
```

nvm install:
```bash
  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

  nvm install 10.0.0
```

If you wanna full PWA application run:

```js
  npm i express spdy --save
```

## Setup certificate: ##

Install java sdk:

```js
  sudo yum install java-1.8.0-openjdk
```

#### Simple run first time: ####
```
docker run -d --net="host" -e openvidu.secret=MAXIMUM -e openvidu.publicurl=https://maximumroulette.com:4443 -e openvidu.cdr=true -e server.port=4443 -e --rm -v /var/run/docker.sock:/var/run/docker.sock -v /var/applications/kurento-project/rec:/var/applications/kurento-project/rec -e openvidu.recording=true -e MY_UID=$(id -u $USER) -e openvidu.recording.path=/var/applications/kurento-project/rec -e openvidu.recording.public-access=true  openvidu/openvidu-server-kms:2.12.0
```

#### Prepare certificate: ####

Export certificate in p12 format (password will be asked)
YOUR_CRT.crt and YOUR_KEY.key files may be YOUR_CRT.pem a

Step 1:

```bash
openssl pkcs12 -export -name YOUR_KEYSTORE_ALIAS -in /etc/httpd/conf/ssl/maximumroulette_com.crt -inkey /etc/httpd/conf/ssl/maximumroulette.com.key -out p12keystore.p12
```
 - password m**********


#### Generate jks (password will be asked again) ####

Step 2:

```js
keytool -importkeystore -srckeystore p12keystore.p12 -srcstoretype pkcs12 -deststoretype pkcs12 -alias YOUR_KEYSTORE_ALIAS -destkeystore YOUR_KEYSTORE_NAME.jks
```
 - password same !

Enter intro container bash (if needed):

```bash
  docker exec -it ab3f39d64359 bash
```

 Copy cert and create new image.

```bash
docker cp /var/applications/kurento-project/YOUR_KEYSTORE_NAME.jks ab3f39d64359:/var/applications/kurento-project/YOUR_KEYSTORE_NAME.jks
```

After all create new image:
```
  docker commit ab3f39d64359 maximumroulette:2.12.0
```

In order to use your JKS, just give the proper value
to the following OpenVidu Server properties on launch
inline:

```js
  server.ssl.key-store=/var/applications/kurento-project/YOUR_KEYSTORE_NAME.jks
  server.ssl.key-store-password=maxi123
  server.ssl.key-alias=YOUR_KEYSTORE_ALIAS
```

In aspect of TURN server:

With TURN server:

```js
docker run -d --net="host" -e openvidu.secret=YOUR_SECRET -e openvidu.publicurl=https://IP:4443
        -e openvidu.cdr=true -e server.port=4443 -e KMS_STUN_IP=IP -e KMS_STUN_PORT=19302
        -eKMS_TURN_URL=myuser:mypass@IP:3478 --rm -v /var/run/docker.sock:/var/run/docker.sock
        -v /var/KMS/rec:/var/KMS/rec -e openvidu.recording=true -e MY_UID=$(id -u $USER)
        -e openvidu.recording.path=/var/KMS/rec -e openvidu.recording.public-access=true openvidu/openvidu-server-kms:latest

```

Without TURN:

```py
  docker run -d --net="host" -e openvidu.secret=MAXIMUM -e openvidu.publicurl=https://maximumroulette.com:4443 -e openvidu.cdr=true -e server.port=4443 -e --rm -v /var/run/docker.sock:/var/run/docker.sock -v /var/applications/kurento-project/rec:/var/applications/kurento-project/rec -e openvidu.recording=true -e MY_UID=$(id -u $USER) -e openvidu.recording.path=/var/applications/kurento-project/rec -e openvidu.recording.public-access=true -e openvidu/openvidu-server-kms:2.12.0
```

Run node for hosting client:

Run:

```py
 docker run -d --net="host" -e openvidu.secret=MAXIMUM -e openvidu.publicurl=https://maximumroulette.com:4443 -e openvidu.cdr=true -e server.port=4443 -e --rm -v /var/run/docker.sock:/var/run/docker.sock -v /var/applications/kurento-project/rec:/var/applications/kurento-project/rec -e openvidu.recording=true -e MY_UID=$(id -u $USER) -e openvidu.recording.path=/var/applications/kurento-project/rec -e openvidu.recording.public-access=true -e server.ssl.key-store=/var/applications/kurento-project/YOUR_KEYSTORE_NAME.jks -e server.ssl.key-store-password=maxi123 -e server.ssl.key-alias=YOUR_KEYSTORE_ALIAS maximumroulette:2.12.0
```

```js
  node server.js https://maximumroulette.com:4443 MAXIMUM
```

## Setup connector [DEV - WIP] ##

 -
