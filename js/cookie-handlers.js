async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        console.log('Text copied to clipboard');
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var getButton = document.getElementById('get');
    var cookieList = document.getElementById('cookie-list');
    var updateButton = document.getElementById('update');
    var copyButton = document.getElementById('copy');
    var detailButton = document.getElementById('detail');
    var cleanButton = document.getElementById('clean');
    var jsonString = ''
    var offerId = ''
    var productTitle = ''
    var productSummary = ''

    cleanButton.addEventListener('click', function(){
        chrome.browsingData.removeCookies({}, function(){
          cookieList.textContent = '已经删除了所有Cookie......';
        });

        document.getElementById('userName').value = '';

        cookieList.textContent = 'Cookie清理完成.........'
    });

    detailButton.addEventListener('click', function(){
        cookieList.textContent = ''

        chrome.tabs.getSelected(null, function(tab) {
            var url = tab.url;

            var begin = url.indexOf("offer/");
            if (begin == -1) {
                cookieList.textContent = '请打开1688商品详情页，再点击抓取商品详情按钮。';

                return;
            }

            begin = begin + 6;

            var end = url.indexOf(".htm");

            offerId = url.substring(begin,end);

            userName = document.getElementById('userName').value;
            if (userName == '') {
                cookieList.textContent = '请先点击获取Cookie按钮。';

                return;
            }

            var data = {
                "offerId": offerId,
                "userName": userName
            };

            url = 'http://192.168.8.111:10015/aliWangWang/getDetail';

            cookieList.textContent = '数据抓取中，请耐心等待...........'
            fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
              })
              .then(response => {
                if (response.status == 200) {
                    return response.text();
                } else {
                    return '抓取失败，返回码：' + response.status;
                }
              })
              .then(text => {
                var obj = JSON.parse(text);
                var result = '';
                result += '商品标题：'+ obj.title + '\n';
                result += '商品价格：'+ obj.price + '\n';
                result += '起批量：'+ obj.start + '\n';
                result += '跨境属性:\n';
                cross = obj.pCross;
                for (c in cross) {
                  result += '\t' + c + ':' + cross[c] + '\n';
                }

                result += '商品属性：\n';
                
                attrs = obj.pAttrs;
                for (attr in attrs) {
                  result += '\t' + attr + ':' + attrs[attr] + '\n';
                }

                productSummary = '参考价格:' + obj.price + ' 起批量:' + obj.start;

                cookieList.textContent = result;

                productTitle = obj.title;

                var imageContent = '<br><h4>商品图列表</h4><br>';
                for (image in obj.images) {
                  imageContent += "<img width='620px' height='100%' src='" + obj.images[image] + "'><br>"
                }
                document.getElementById('image_list').innerHTML = imageContent;
              })
              .catch(error => cookieList.textContent = 'Error:' + error); 
        });
    });

    copyButton.addEventListener('click', function(){
        copyTextToClipboard(cookieList.textContent);
        
        alert('已复制到剪切板，同时转发到企业微信。');

        robot = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=bda14df6-be9b-4064-8623-94799fd1bbf1'; 

        var data = {}
        if (offerId != '') {
          data = {
            "msgtype": "news",
            "news": {
              "articles" : [
                  {
                      "title" : productTitle,
                      "description" : productSummary,
                      "url" : "https://detail.1688.com/offer/" + offerId + ".html", 
                      "picurl" : "https://pic.rmb.bdstatic.com/bjh/news/75d17a5b01851ee3943bcbb37b7c3bd8.png"
                  }
              ]
            }
          };
      } else {
        data = {
          "msgtype": "text",
          "text": {
            "content": cookieList.textContent
          }
        };
      }

      fetch(robot, {
          method: 'POST',
          body: JSON.stringify(data)
        })
        .then(response => { response
        })
        .catch(error => error); 

        cookieList.textContent = '';
    });
  
    getButton.addEventListener('click', function() {
      var flag = 0
      cookieList.textContent = ''
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var url = tabs[0].url;
        chrome.cookies.getAll({url: url}, function(cookies) {
          cookies.map((c) => {
            if (c.name == '__cn_logon_id__') {
                document.getElementById('userName').value = c.value;
                flag = 1;
            }
          });

          if (flag == 0) {
            cookieList.textContent = '请先用自己的账号登录1688网站';

            return;
          } 
          
          jsonString = JSON.stringify(cookies)
          var jsArray = JSON.parse(jsonString);
          jsArray.forEach(function(item) {
            if (item.domain != '.1688.com' || item.domain == '') {
                item.domain = '.1688.com';
            }
            if (item.sameSite != 'None') {
                item.sameSite = 'None';
            }}
          );
          jsonString = JSON.stringify(jsArray)
          cookieList.textContent = jsonString
        });
      });
    });

    updateButton.addEventListener('click', function() {
        cookieList.textContent = 'Cookie更新中，需要重新创建会话，请耐心等待.........'

        var userName = document.getElementById('userName').value

        url = 'http://192.168.8.111:10015/aliWangWang/cookie/update/' + userName;

        fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: jsonString
          })
          .then(response => {
            if (response.status == 200) {
                cookieList.textContent = 'Cookie更新成功！';
            } else {
                cookieList.textContent = 'Cookie更新失败，返回码：' + response.status;
            }
          })
          .catch(error => cookieList.textContent = 'Error:' + error); 
        });
  });