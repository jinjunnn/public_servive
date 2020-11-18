import csv
import leancloud
from datetime import datetime
import json
from leancloud import cloudfunc
# 这个是电商项目
leancloud.init(
    "XBtceMXXkxxRQez6lQBCJ8UK-gzGzoHsz", master_key="KlbmMqYVvcOC7adJvwoRO9Ww")

ge = cloudfunc.run(
    'send_subscribe_message',
    key='settings',
    field='share_page_rule',
    value='name')
