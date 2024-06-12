const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);


const createMailBtn = $('#createMail_button')
const authorizeBtn = $('#authorize_button')
const signoutBtn = $('#signout_button')
const maiList = $('#mail_list')
const maincontent = $(".maincontent");
const sendMailSec = $(".sendEmailSec")
const closeBtn = $("#close-button")
const welcomeUser = $("#welcomeUser")
createMailBtn.style.visibility = 'hidden';

// let downloadUrl = '';


const CLIENT_ID = '278727965808-65flm6g15el2p82mpq8o8u8q8klpj685.apps.googleusercontent.com';
const API_KEY = 'AIzaSyB3DlKeY-V7_cqdi_W5hmgZD-yMMtOl8yU';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';
const SCOPES = "https://mail.google.com/";

const SUPPORTED_ATTACHMENT_TYPES = [
    'text/plain',
    'text/html',
    'application/pdf',
    'application/msword', // doc files
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx files
    'application/vnd.ms-excel', // xls files
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx files
    'application/vnd.ms-powerpoint', // ppt files
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx files
    'application/rtf', // rtf files
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/svg+xml',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'video/mp4',
    'video/ogg',
    'video/webm',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/x-7z-compressed',
    'application/x-bzip',
    'application/x-bzip2',
    'application/gzip',
    'application/octet-stream',
];

let tokenClient;
let gapiInited = false;
let gisInited = false;

authorizeBtn.style.visibility = 'hidden';
signoutBtn.style.visibility = 'hidden';
$('.loader').classList.add("hidden")


// function gapiLoaded() {
//     gapi.load('client', initializeGapiClient);
// }
function gapiLoaded() {
    return new Promise((resolve, reject) => {
        gapi.load('client', () => {
            initializeGapiClient().then(resolve).catch(reject);
        });
    });
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}


function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}


function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        authorizeBtn.style.visibility = 'visible';
    }
}

var mails = []


authorizeBtn.onclick = function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }

        localStorage.setItem('google_token', JSON.stringify(resp)); // Lưu token vào localStorage

        createMailBtn.style.visibility = 'visible';
        signoutBtn.style.visibility = 'visible';
        authorizeBtn.innerText = 'change account';
        await listMessages();

        // Lấy thông tin người dùng sau khi xác thực thành công
        const userInfo = await gapi.client.gmail.users.getProfile({ userId: 'me' });
        const userEmail = userInfo.result.emailAddress;
        document.getElementById("userGmail").innerText = userEmail;
        welcomeUser.style.display = 'block';
        // console.log(gapi.client.getToken())

    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

signoutBtn.onclick = function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        localStorage.removeItem('google_token'); // Xóa token khỏi localStorage
        authorizeBtn.innerText = 'Sign In';
        signoutBtn.style.visibility = 'hidden';
        createMailBtn.style.visibility = 'hidden';
        document.getElementById("userGmail").innerText = ''; // Xóa thông tin người dùng khi đăng xuất
        welcomeUser.style.display = 'none';
        var email = document.getElementById("Inbox");
        email.innerHTML = '';
    }
}

createMailBtn.onclick = function () {
    $('#send-button').classList.remove('disabled');
}

async function checkTokenAndInitialize() {
    const token = localStorage.getItem('google_token');
    if (token) {
        const parsedToken = JSON.parse(token);
        gapi.client.setToken(parsedToken); // Thiết lập lại token cho gapi client
        createMailBtn.style.visibility = 'visible';
        signoutBtn.style.visibility = 'visible';
        authorizeBtn.innerText = 'change account';
        // Các hành động khác để khôi phục trạng thái đăng nhập

        await listMessages();

        // Lấy thông tin người dùng sau khi xác thực thành công
        const userInfo = await gapi.client.gmail.users.getProfile({ userId: 'me' });
        const userEmail = userInfo.result.emailAddress;
        document.getElementById("userGmail").innerText = userEmail;
        welcomeUser.style.display = 'block';
        // console.log(gapi.client.getToken())
    }
}

document.addEventListener("DOMContentLoaded", function () {
    gapiLoaded().then(() => {
        checkTokenAndInitialize(); // Kiểm tra và khôi phục token khi trang được tải
    });
    var closeBtn = document.getElementById("closeBtn");
    if (closeBtn) {
        closeBtn.onclick = function () {
            sendMailSec.classList.add("hidden");
            document.getElementById("compose-to").value = '';
            document.getElementById("compose-subject").value = '';
            document.getElementById("compose-message").value = '';
            document.getElementById("file-input").value = "";
        };
    }
});


async function listMessages() {
    Array.from(document.getElementsByClassName('option-view')).forEach((button) => {
        button.disabled = true;
    });
    let labelIds = '';
    let activeButton = document.querySelector('.option-view.active');

    if (activeButton.innerText === 'Hộp thư đến') {
        labelIds = 'INBOX';
    } else if (activeButton.innerText === 'Thư đã gửi') {
        labelIds = 'SENT';
    }

    // Xóa nội dung hiện tại trên bảng
    var tableBody = document.querySelector(".table-inbox tbody");
    tableBody.innerHTML = '';
    var request = gapi.client.gmail.users.messages.list({
        'userId': 'me',
        'labelIds': labelIds,
        'maxResults': 50,
        'q': 'newer_than:7d'
    });

    request.execute(async function (response) {
        var messages = response.result.messages;
        if (messages && messages.length > 0) {
            let messagePromises = messages.map((message) => {
                return new Promise((resolve, reject) => {
                    var messageRequest = gapi.client.gmail.users.messages.get({
                        'userId': 'me',
                        'id': message.id
                    });
                    messageRequest.execute((msgResponse) => {
                        appendMessageRow(msgResponse);
                        resolve(msgResponse); // Resolve promise khi tin nhắn được xử lý xong
                    });
                });
            });
            // Đợi cho đến khi tất cả tin nhắn đã được xử lý
            await Promise.all(messagePromises);
            console.log("Tất cả tin nhắn đã được tải xong.");
            Array.from(document.getElementsByClassName('option-view')).forEach((button) => {
                button.disabled = false;
            });
            // Thực hiện các hành động tiếp theo tại đây
        } else {
            console.log("Không có tin nhắn mới.");
            Array.from(document.getElementsByClassName('option-view')).forEach((button) => {
                button.disabled = false;
            });
        }
    });
}

function appendMessageRow(data) {
    // console.log(data)
    let date = '';
    let from = '';
    let to = '';
    let subject = '';
    for (let i in data.payload.headers) {
        if (data.payload.headers[i].name == "Date") {
            date = data.payload.headers[i].value;
        }
        if (data.payload.headers[i].name == "From") {
            from = data.payload.headers[i].value;
        }
        if (data.payload.headers[i].name == "To") {
            to = data.payload.headers[i].value;
        }
        if (data.payload.headers[i].name == 'Subject') {
            subject = data.payload.headers[i].value;
        }
    }
    var tableBody = document.querySelector(".table-inbox tbody");


    var tr = document.createElement("tr");

    if (document.getElementById('source-mail').innerText == 'From') {
        var tdFrom = document.createElement("td");
        tdFrom.textContent = from;
    } else {
        var tdTo = document.createElement("td");
        tdTo.textContent = to;
    }

    var tdSubject = document.createElement("td");
    var link = document.createElement("a");
    link.target = "_blank";
    link.href = '#message-modal-' + data.id;
    link.setAttribute("data-toggle", "modal");
    link.id = "message-link-" + data.id;
    link.textContent = subject;
    tdSubject.appendChild(link);

    var tdDate = document.createElement("td");
    tdDate.textContent = date;


    if (document.getElementById('source-mail').innerText == 'From') {
        tr.appendChild(tdFrom);
    } else {
        tr.appendChild(tdTo);
    }
    tr.appendChild(tdSubject);
    tr.appendChild(tdDate);

    tableBody.appendChild(tr);
    var body = document.querySelector("body");

    var divModal = document.createElement("div");
    divModal.className = "modal fade";
    divModal.id = "message-modal-" + data.id;
    divModal.setAttribute("tabindex", "-1");
    divModal.setAttribute("role", "dialog");
    divModal.setAttribute("aria-labelledby", "myModalLabel");

    var divModalDialog = document.createElement("div");
    divModalDialog.className = "modal-dialog modal-lg";

    var divModalContent = document.createElement("div");
    divModalContent.className = "modal-content";

    var divModalHeader = document.createElement("div");
    divModalHeader.className = "modal-header";

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close";
    closeButton.setAttribute("data-dismiss", "modal");
    closeButton.setAttribute("aria-label", "Close");
    closeButton.innerHTML = '<span aria-hidden="true">&times;</span>';

    var h4ModalTitle = document.createElement("h4");
    h4ModalTitle.className = "modal-title";
    h4ModalTitle.id = "myModalLabel";
    h4ModalTitle.innerHTML = subject;

    var divModalBody = document.createElement("div");
    divModalBody.className = "modal-body";

    var iframeMessage = document.createElement("iframe");
    iframeMessage.id = "message-iframe-" + data.id;
    iframeMessage.srcdoc = "<p>Loading...</p>";

    divModalHeader.appendChild(closeButton);
    divModalHeader.appendChild(h4ModalTitle);
    divModalBody.appendChild(iframeMessage);
    divModalContent.appendChild(divModalHeader);
    divModalContent.appendChild(divModalBody);
    divModalDialog.appendChild(divModalContent);
    divModal.appendChild(divModalDialog);
    body.appendChild(divModal);

    document.getElementById("message-link-" + data.id).addEventListener("click", async function () {
        getBody(data.payload, data.id).then((content) => {
            var ifrm = document.getElementById("message-iframe-" + data.id).contentWindow.document;
            ifrm.body.innerHTML = content;
            // console.log('payload: ', data.payload)
        }).catch((error) => {
            console.error("Error getting message body:", error);
        });

    });
}

async function getBody(message, messageId) {
    var encodedBody = '';
    if (typeof message.parts === 'undefined') {
        encodedBody = message.body.data;
    } else {
        try {
            encodedBody = await getHTMLPart(message.parts, messageId);
        } catch (error) {
            console.error("Error getting HTML part:", error);
        }
    }

    encodedBody = encodedBody.replace(/-/g, '+').replace(/_/g, '/');
    // console.log('encodedBody: ', encodedBody);

    try {
        // Giải mã Base64 để lấy chuỗi được mã hóa URI
        var decodedData = atob(encodedBody);
        // Giải mã chuỗi URI để lấy chuỗi UTF-8 ban đầu
        return decodeURIComponent(decodedData.split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        // return decodeURIComponent(escape(window.atob(encodedBody)));
    } catch (error) {
        console.error("Error decoding message body:", error);
        return encodedBody;
    }
}

function getHTMLPart(arr, messageId) {
    return new Promise((resolve, reject) => {
        let attachmentPromises = [];
        let htmltex = '';
        let local = 0;
        let allData = [];

        function processAttachment(arr) {
            for (let x = 0; x < arr.length; x++) {
                if (arr[x].mimeType === 'text/plain') {
                    htmltex = arr[x].body.data;
                    // Chuyển đổi Base64URL thành Base64
                    htmltex = htmltex.replace(/-/g, '+').replace(/_/g, '/');
                    // Giải mã Base64 thành chuỗi byte
                    htmltex = atob(htmltex);
                    // Giải mã chuỗi byte thành chuỗi UTF-8
                    htmltex = decodeURIComponent(htmltex.split('').map(c =>
                        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                    ).join(''));
                    allData.push(htmltex); // Lưu trữ dữ liệu vào mảng
                    local = allData.length - 1;
                }
                if (arr[x].mimeType === 'text/html' && arr[x].filename === '') {
                    htmltex = arr[x].body.data;
                    // Chuyển đổi Base64URL thành Base64
                    htmltex = htmltex.replace(/-/g, '+').replace(/_/g, '/');
                    // Giải mã Base64 thành chuỗi byte
                    htmltex = atob(htmltex);
                    // Giải mã chuỗi byte thành chuỗi UTF-8
                    htmltex = decodeURIComponent(htmltex.split('').map(c =>
                        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                    ).join(''));
                    allData[local] = htmltex; // Lưu trữ dữ liệu vào mảng
                    // } else if (SUPPORTED_ATTACHMENT_TYPES.includes(arr[x].mimeType)) {
                } else {
                    const filename = arr[x].filename;
                    const mimeType = arr[x].mimeType;
                    const filenum = parseInt(arr[x].partId);
                    if (!filename) continue;
                    if (SUPPORTED_ATTACHMENT_TYPES.includes(mimeType)) {
                        attachmentPromises.push(new Promise((resolve, reject) => {
                            // Lấy dữ liệu của file đính kèm
                            gapi.client.gmail.users.messages.attachments.get({
                                'userId': 'me',
                                'messageId': messageId,
                                'id': arr[x].body.attachmentId
                            }).execute(function (response) {
                                if (response.error) {
                                    console.error("Error fetching attachment:", response.error);
                                    reject(response.error);
                                } else {
                                    // Chuyển đổi Base64URL thành Base64
                                    let dataBase64 = response.result.data.replace(/-/g, '+').replace(/_/g, '/');
                                    if (mimeType.startsWith('image/')) {
                                        let attach = `<p>Attachment ${filenum}: ${filename}<br> <img src="data:${mimeType};base64, ${dataBase64}" alt="${filename}" style="max-width:90%; display: block; margin-left: auto; margin-right: auto; margin-top:15px;"></p>`;
                                        // allData.push(attach);
                                        resolve(attach);
                                    } else {
                                        let attach = `<p>Attachment ${filenum}: <a href="data:${mimeType};base64,${dataBase64}" download="${filename}">${filename}</a></p>`;
                                        resolve(attach); // Lưu trữ dữ liệu vào mảng
                                    }
                                }
                            });
                        }));
                    } else{
                        let attach = `<p>Attachment ${filenum}: ${filename} (Không hỗ trợ tải xuống với định dang: ${mimeType})</p>`;
                        allData.push(attach);
                    }


                    // // Mã hóa chuỗi UTF-8 thành chuỗi ASCII sử dụng encodeURIComponent
                    // attach = encodeURIComponent(attach);

                    // // Mã hóa chuỗi ASCII thành Base64
                    // attach = btoa(attach);

                    // // Chuyển đổi từ Base64 sang Base64URL
                    // attach = attach.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');


                }
            }
        }

        // console.log('allData:', allData)


        function processParts(arr) {
            for (let x = 0; x < arr.length; x++) {
                // console.log('arr:', arr[x])
                if (arr[x].parts && arr[x].parts.length > 0) {
                    processParts(arr[x].parts);
                } else {
                    processAttachment([arr[x]]);
                }
            }
        }

        processParts(arr);

        Promise.all(attachmentPromises).then((results) => {
            allData.push(...results);
            // Sắp xếp mảng allData theo thứ tự tăng dần của n
            allData.sort((a, b) => {
                const numA = extractAttachmentNumber(a);
                const numB = extractAttachmentNumber(b);
                return numA - numB; // Sắp xếp theo thứ tự tăng dần của n
            });
            // console.log('allData da sap xep:', allData)
            let encodedString = allData.join('');
            // let finalEncodedString = btoa(encodedString); // Mã hóa chuỗi kết quả thành Base64 URL-safe
            // finalEncodedString = finalEncodedString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            let Bytes = encodeURIComponent(encodedString).replace(/%([0-9A-F]{2})/g,
                (match, p1) => String.fromCharCode('0x' + p1));
            // Mã hóa chuỗi byte thành Base64
            let base64 = btoa(Bytes);
            // Chuyển đổi Base64 thành Base64URL
            let finalEncodedString = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            resolve(finalEncodedString);
            // resolve(results.join(''));
        }).catch((error) => {
            reject(error);
        });
    });
}


function composeTidy(res) {
    // console.log("Đã gửi mail:");
    $('.loader').classList.add("hidden")
    document.getElementById("statusMessage").style.display = 'none';
    let message = '';
    if (res == 'success')
        message = "Đã gửi mail!";
    else
        message = "Lỗi khi gửi mail!";

    $("#compose-to").value = ''
    $("#compose-subject").value = ''
    $("#compose-message").value = ''
    document.getElementById("file-input").value = "";
    alertWithCallback(message, function () {
        $("#compose-to").value = '';
        $("#compose-subject").value = '';
        $("#compose-message").value = '';
        document.getElementById("file-input").value = "";
        $('#send-button').classList.remove('disabled');
        let optionView = document.getElementById('optionViewSent');
        handleOptionViewClick(optionView);
    });

}

function alertWithCallback(message, callback) {
    alert(message);
    if (typeof callback === 'function') {
        callback();
    }
}

function sendEmail() {
    window.event.preventDefault();
    $('#send-button').classList.add("disabled");
    document.getElementById("closeModal").click();
    $('.loader').classList.remove("hidden");
    document.getElementById("statusMessage").style.display = 'block';
    document.getElementById("statusMessage").textContent = 'Đang gửi mail...';

    var recipient = $("#compose-to").value;
    var subject = $("#compose-subject").value;
    var message = $("#compose-message").value;
    var fileInput = document.getElementById("file-input");
    var files = fileInput.files;

    var boundary = 'boundary-example';
    var emailContent =
        'From: Your Name <your-email@example.com>\r\n' +
        'To: ' + recipient + '\r\n' +
        'Subject: ' + encodeSubject(subject) + '\r\n' +
        'Content-Type: multipart/mixed; boundary="' + boundary + '"\r\n' +
        '\r\n' +
        '--' + boundary + '\r\n' +
        'Content-Type: text/plain; charset="UTF-8"\r\n' +
        '\r\n' +
        message + '\r\n';

    var reader = new FileReader();
    var currentFileIndex = 0;

    reader.onload = function (e) {
        var fileContent = e.target.result;
        var file = files[currentFileIndex];
        emailContent +=
            '--' + boundary + '\r\n' +
            'Content-Type: ' + file.type + '; name="' + file.name + '"\r\n' +
            'Content-Disposition: attachment; filename="' + file.name + '"\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            btoa(fileContent) + '\r\n';

        currentFileIndex++;
        if (currentFileIndex < files.length) {
            reader.readAsBinaryString(files[currentFileIndex]);
        } else {
            emailContent += '--' + boundary + '--';
            var encodedEmail = btoaUnicode(emailContent).replace(/\+/g, '-').replace(/\//g, '_');

            gapi.client.gmail.users.messages.send({
                'userId': 'me',
                'resource': {
                    'raw': encodedEmail
                }
            }).then(function (response) {
                console.log('Email sent:', response);
                // alert('Email đã được gửi thành công!');
                composeTidy('success');
            }, function (error) {
                console.log('Error sending email:', error);
                // alert('Lỗi khi gửi .email: ' + error);
                composeTidy('error');
            });
        }
    };

    if (files.length > 0) {
        reader.readAsBinaryString(files[0]);
    } else {
        emailContent += '--' + boundary + '--';
        var encodedEmail = btoaUnicode(emailContent).replace(/\+/g, '-').replace(/\//g, '_');

        gapi.client.gmail.users.messages.send({
            'userId': 'me',
            'resource': {
                'raw': encodedEmail
            }
        }).then(function (response) {
            console.log('Email sent:', response);
            // alert('Email đã được gửi thành công!');
            composeTidy('success');
        }, function (error) {
            console.log('Error sending email:', error);
            // alert('Lỗi khi gửi email: ' + error);
            composeTidy('error');
        });
    }
}

function encodeSubject(subject) {
    return '=?utf-8?B?' + btoa(encodeURIComponent(subject).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode('0x' + p1);
    })) + '?=';
}

function btoaUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
        return String.fromCharCode(parseInt(p1, 16));
    }));
}




function changeColor(button) {
    // Xóa lớp 'active' khỏi tất cả các nút
    let buttons = document.querySelectorAll('.option-view');
    let sourceMail = document.getElementById('source-mail');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Thêm lớp 'active' cho nút được nhấn
    button.classList.add('active');

    let checkSourceMail = button.innerText;
    if (checkSourceMail == 'Thư đã gửi') {
        sourceMail.innerText = 'To'
    } else {
        sourceMail.innerText = 'From'
    }
}

async function handleOptionViewClick(optionView) {
    changeColor(optionView);
    await listMessages();
}

// Hàm so sánh tùy chỉnh để trích xuất giá trị n từ chuỗi
function extractAttachmentNumber(str) {
    // Sử dụng biểu thức chính quy để tìm giá trị n trong chuỗi
    const match = str.match(/Attachment (\d+)/);
    if (match) {
        return parseInt(match[1]); // Chuyển đổi giá trị n sang số nguyên
    }
    return 0; // Trả về 0 nếu không tìm thấy giá trị n
}