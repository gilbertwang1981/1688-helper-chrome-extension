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
    var masterPic = '';

    cleanButton.addEventListener('click', function(){
        chrome.browsingData.removeCookies({}, function(){});

        document.getElementById('userName').value = '';

        cookieList.textContent = 'Cookie清理完成.........'
    });

    detailButton.addEventListener('click', function(){
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
                var result = '<b><h3>基础信息</h3></b>';
                result += '<b>商品标题:</b>'+ obj.title + '<br>';
                result += '<b>商品价格:</b>'+ obj.price + '<br>';
                result += '<b>起批量:</b>'+ obj.start + '<br><br>';

                result += '<b><h3>属性信息</h3></b>';
                cross = obj.pCross;
                result += '<table border=0><tr><th>商品属性</th><th>商品属性值</th></tr>'
                for (c in cross) {
                  result += '<tr><td>' + c + '</td><td>' + cross[c] + '</td></tr>';
                }

                attrs = obj.pAttrs;
                for (attr in attrs) {
                  result += '<tr><td>' + attr + '</td><td>' + attrs[attr] + '</td></tr>';
                }

                result += '</table>';

                result += '<br><b><h3>颜色信息</h3></b>';
                result += '<table border=0><tr><th>缩略图</th><th>文本描述</th></tr>'
                for (color in obj.colors) {
                  result += '<tr><td><img width="50px" height="50px" src="' + obj.colors[color].url + '"></td><td>' + obj.colors[color].title + '</td></tr>';
                }

                result += '</table>';

                result += '<br><b><h3>尺码信息</h3></b>';
                result += '<table border=0><tr><th>SKU</th><th>价格</th><th>库存</th></tr>';
                for (sku in obj.skus) {
                  result += '<tr><td>' + obj.skus[sku].name + '</td><td>' + obj.skus[sku].price + '</td><td>' + obj.skus[sku].stock + '</td></tr>';
                }

                result += '</table>'

                productSummary = '参考价格:' + obj.price + ' 起批量:' + obj.start;

                cookieList.innerHTML = result;

                productTitle = obj.title;

                var imageContent = '';
                masterPic = obj.images[0]
                for (image in obj.images) {
                  imageContent += "<img width='580px' height='100%' src='" + obj.images[image] + "'><br>"
                }
                document.getElementById('image_list').innerHTML = imageContent;
                
                document.getElementById('video').innerHTML = '<video controls muted="muted" type="video/mp4" width="580px" height="100%" src="' + obj.video + '">';
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
                      "picurl" : masterPic
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