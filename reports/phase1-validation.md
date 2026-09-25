# PHASE 1 — Validation report

- Generated: 2026-09-25T04:16:44.315Z by `pnpm validate`
- Result: **PASS**

## Entity counts

| Entity | Count |
|---|---|
| characters | 322 |
| words | 541 |
| words (curriculum) | 518 |
| word senses | 2223 |
| sentences | 351 |
| sentence tokens | 1460 |
| sentence translations | 356 |
| grammar points | 62 |
| audio assets | 562 |
| lessons | 14 |
| entity_sources | 2644 |
| review_queue | 60 |

## Mapping

| Metric | Value |
|---|---|
| words linked to characters | 541 / 541 |
| tokens mapped to words | 1458 / 1460 |
| sentences with every token mapped | 279 / 281 |
| sentences linked to grammar points | 237 / 351 |
| lessons → items (words / sentences) | 14 → 467 / 562 |
| curriculum words used in a lesson | 467 / 518 |
| HSK assignments (character / word / sentence / grammar / lesson) | 300 / 518 / 281 / 62 / 14 |

## Provenance (entity_sources by source)

| Source | Entity | Rows |
|---|---|---|
| complete-hsk-vocabulary | word | 518 |
| cvdict | word | 628 |
| derived | character | 322 |
| derived | lesson | 14 |
| hsk-grammar-krmanik | grammar | 62 |
| hsk-sentences-audio | sentence | 281 |
| hsk1-chinese-learning | sentence | 75 |
| hsk1-chinese-learning | word | 150 |
| makemeahanzi | character | 322 |
| unihan-kvietnamese | character | 272 |

## Checks

| Check | Severity | Result |
|---|---|---|
| Duplicate character (NFC hanzi) | error | ✅ 0 |
| Duplicate word (simplified + pinyin key) | error | ✅ 0 |
| Duplicate word (simplified + tone-marked pinyin, case-insensitive) | error | ✅ 0 |
| Duplicate sentence (content hash) | error | ✅ 0 |
| Duplicate sentence (identical text) | error | ✅ 0 |
| character without source/source_id | error | ✅ 0 |
| word without source/source_id | error | ✅ 0 |
| sentence without source/source_id | error | ✅ 0 |
| grammar without source/source_id | error | ✅ 0 |
| lesson without source/source_id | error | ✅ 0 |
| Lesson item pointing to a missing entity | error | ✅ 0 |
| Lesson reference that could not be resolved | error | ✅ 0 |
| Broken audio reference | error | ✅ 0 |
| hsk-sentences-audio sentence without normal+slow audio | error | ✅ 0 |
| Character without pinyin reading | warning | ✅ 0 |
| Word without pinyin | error | ✅ 0 |
| Sentence without pinyin | warning | ✅ 0 |
| Curriculum word without a publishable Vietnamese meaning | warning | ⚠️ 1 |
| Curriculum word without any Vietnamese meaning (incl. non-publishable) | warning | ⚠️ 1 |
| Sentence without a publishable Vietnamese translation | warning | ⚠️ 351 |
| Character without Sino-Vietnamese reading | warning | ⚠️ 45 |
| Curriculum word without HSK level | error | ✅ 0 |
| Sentence without HSK level | warning | ⚠️ 70 |
| Grammar point without HSK level | error | ✅ 0 |
| Character of a curriculum word without derived HSK level | error | ✅ 0 |
| Sentence token not mapped to a word | warning | ⚠️ 1 |
| HSK list item with several possible readings (all kept) | warning | ⚠️ 9 |
| hsk1-chinese-learning word not mapped | warning | ✅ 0 |

### Curriculum word without a publishable Vietnamese meaning (1)

| simplified | pinyin_marked |
|---|---|
| "车上" | "chē shàng" |

### Curriculum word without any Vietnamese meaning (incl. non-publishable) (1)

| simplified | pinyin_marked |
|---|---|
| "车上" | "chē shàng" |

### Sentence without a publishable Vietnamese translation (351)

| id | simplified |
|---|---|
| 1 | "老师，您好！" |
| 2 | "你好，很高兴认识你。" |
| 3 | "谢谢你！不客气。" |
| 4 | "对不起。没关系。" |
| 5 | "请问，你叫什么名字？" |
| 6 | "请进，请坐。" |
| 7 | "老师再见！" |
| 8 | "我来介绍一下我的朋友。" |
| 9 | "他是谁？" |
| 10 | "他是我的老师。" |
| 11 | "你们都是学生吗？" |
| 12 | "我们是同学。" |
| 13 | "她也是医生。" |
| 14 | "他们是工人。" |
| 15 | "我是中国人，你呢？" |
| 16 | "那个男生是我朋友。" |
| 17 | "这个女生很认真。" |
| 18 | "先生，您找谁？" |
| 19 | "别人都来了，就他没来。" |
| 20 | "我家有五口人。" |
| 21 | "这是我爸爸和妈妈。" |
| 22 | "我有一个哥哥和一个妹妹。" |
| 23 | "他是我弟弟，她是我姐姐。" |
| 24 | "爷爷和奶奶身体都很好。" |
| 25 | "这是我儿子，那是我女儿。" |
| 26 | "她是我女朋友，他是我男朋友。" |
| 27 | "我妈妈是老师，我爸爸是工人。" |
| 28 | "我们是一家人。" |
| 29 | "我今年二十岁。" |
| 30 | "一年有十二个月。" |
| 31 | "一个星期有七天。" |
| 32 | "他有两个孩子。" |
| 33 | "我买了三本书。" |
| 34 | "我们班有四十个学生。" |
| 35 | "这是第二次。" |
| 36 | "一半是我的，一半是你的。" |
| 37 | "这本书一百块钱。" |
| 112 | "我要去火车站。" |
| 38 | "弟弟六岁，妹妹三岁。" |
| 39 | "南边比北边热。" |
| 40 | "现在几点？" |
| 41 | "现在是上午九点半。" |
| 42 | "今天是星期几？" |
| 43 | "明天是星期天。" |
| 44 | "昨天是星期日。" |
| 45 | "我上午有课，下午没有。" |
| 46 | "我们中午一起吃午饭。" |
| 47 | "他晚上常常学习。" |
| 48 | "明年是新年。" |
| 49 | "去年我在北京。" |
| 50 | "现在是白天，不是晚上。" |
| 51 | "前天下雨了，今天没雨。" |
| 52 | "他后天回家。" |
| 53 | "有时候我早上跑，有时候走路。" |
| 54 | "我早上七点起床。" |
| 55 | "我很累，想睡觉。" |
| 56 | "你想喝水吗？" |
| 57 | "我想喝一杯茶。" |
| 58 | "我们一起吃饭吧。" |
| 59 | "他在看电视。" |
| 60 | "我正在学习写字。" |
| 61 | "请说汉语。" |
| 62 | "你会说中文吗？" |
| 63 | "我会做菜。" |
| 64 | "他喜欢读书。" |
| 65 | "我给你打电话。" |
| 66 | "请打开门。" |
| 67 | "请关上门。" |
| 68 | "他唱歌很好听。" |
| 69 | "我们出去玩儿吧。" |
| 70 | "小朋友在外边跑。" |
| 71 | "他走路很快，我很慢。" |
| 72 | "我要洗手。" |
| 73 | "请坐下，休息一会儿。" |
| 74 | "老师教我们汉字。" |
| 75 | "我忘记他的名字了。" |
| 151 | "我能进来吗？" |
| 76 | "我记得你，也记住了你的话。" |
| 77 | "你知道他家在哪儿吗？" |
| 78 | "我明白了。" |
| 79 | "请告诉我你的电话。" |
| 80 | "我们准备一下就走。" |
| 81 | "他还没起来。" |
| 82 | "请等一下，我马上来。" |
| 83 | "他帮我拿东西。" |
| 84 | "谢谢你帮忙。" |
| 85 | "我在大学学习。" |
| 86 | "他是大学生，我是小学生。" |
| 87 | "我上课，下课就回家。" |
| 88 | "他上班，我上学。" |
| 89 | "下班以后我去商店。" |
| 90 | "明天放假，不用上学。" |
| 91 | "明天考试，我要准备。" |
| 92 | "这次考试很难。" |
| 93 | "图书馆在教学楼旁边。" |
| 94 | "我在学校工作。" |
| 95 | "他常常上网。" |
| 96 | "我在网上有很多网友。" |
| 97 | "他在北京工作。" |
| 98 | "书在桌子上。" |

… 251 more

### Character without Sino-Vietnamese reading (45)

| hanzi |
|---|
| "汽" |
| "椅" |
| "坐" |
| "告" |
| "问" |
| "蛋" |
| "鸡" |
| "时" |
| "桌" |
| "岁" |
| "北" |
| "帮" |
| "面" |
| "么" |
| "她" |
| "诉" |
| "谁" |
| "米" |
| "词" |
| "就" |
| "以" |
| "昨" |
| "欢" |
| "净" |
| "肉" |
| "儿" |
| "菜" |
| "做" |
| "很" |
| "这" |
| "笑" |
| "从" |
| "您" |
| "假" |
| "页" |
| "饿" |
| "跑" |
| "备" |
| "爸" |
| "电" |
| "视" |
| "饭" |
| "苹" |
| "爷" |
| "识" |

### Sentence without HSK level (70)

| id | simplified | sources |
|---|---|---|
| 282 | "你好！" | "hsk1-chinese-learning" |
| 283 | "你好吗？" | "hsk1-chinese-learning" |
| 284 | "我很好。" | "hsk1-chinese-learning" |
| 285 | "谢谢你。" | "hsk1-chinese-learning" |
| 286 | "不客气。" | "hsk1-chinese-learning" |
| 287 | "我叫李明。" | "hsk1-chinese-learning" |
| 288 | "你叫什么名字？" | "hsk1-chinese-learning" |
| 289 | "我是学生。" | "hsk1-chinese-learning" |
| 290 | "他是老师。" | "hsk1-chinese-learning" |
| 291 | "我认识他。" | "hsk1-chinese-learning" |
| 292 | "我是中国人。" | "hsk1-chinese-learning" |
| 293 | "你会说汉语吗？" | "hsk1-chinese-learning" |
| 294 | "我会一点儿。" | "hsk1-chinese-learning" |
| 295 | "她也学习汉语。" | "hsk1-chinese-learning" |
| 296 | "我们在学校学习。" | "hsk1-chinese-learning" |
| 297 | "现在三点。" | "hsk1-chinese-learning" |
| 298 | "我八点上课。" | "hsk1-chinese-learning" |
| 299 | "他十分钟后来。" | "hsk1-chinese-learning" |
| 300 | "今天是五月二号。" | "hsk1-chinese-learning" |
| 301 | "这是我妈妈。" | "hsk1-chinese-learning" |
| 302 | "我爸爸很高兴。" | "hsk1-chinese-learning" |
| 303 | "我有一个哥哥。" | "hsk1-chinese-learning" |
| 304 | "她有两个女儿。" | "hsk1-chinese-learning" |
| 305 | "你家有几口人？" | "hsk1-chinese-learning" |
| 306 | "你在哪儿？" | "hsk1-chinese-learning" |
| 307 | "我在家里。" | "hsk1-chinese-learning" |
| 308 | "学校在前面。" | "hsk1-chinese-learning" |
| 309 | "饭店在后面。" | "hsk1-chinese-learning" |
| 310 | "请坐在这儿。" | "hsk1-chinese-learning" |
| 311 | "我今天去学校。" | "hsk1-chinese-learning" |
| 312 | "他在家看电视。" | "hsk1-chinese-learning" |
| 313 | "我们下午学习。" | "hsk1-chinese-learning" |
| 314 | "她晚上睡觉。" | "hsk1-chinese-learning" |
| 315 | "我想喝茶。" | "hsk1-chinese-learning" |
| 316 | "你吃米饭吗？" | "hsk1-chinese-learning" |
| 317 | "我喜欢中国菜。" | "hsk1-chinese-learning" |
| 318 | "请给我一杯水。" | "hsk1-chinese-learning" |
| 319 | "这个苹果多少钱？" | "hsk1-chinese-learning" |
| 320 | "我们去饭店吧。" | "hsk1-chinese-learning" |
| 321 | "商店在那儿。" | "hsk1-chinese-learning" |
| 322 | "我想买衣服。" | "hsk1-chinese-learning" |
| 323 | "便宜一点儿吧。" | "hsk1-chinese-learning" |
| 324 | "我有二十块钱。" | "hsk1-chinese-learning" |
| 325 | "今天很热。" | "hsk1-chinese-learning" |
| 326 | "昨天很冷。" | "hsk1-chinese-learning" |
| 327 | "外面下雨了。" | "hsk1-chinese-learning" |
| 328 | "你带伞了吗？" | "hsk1-chinese-learning" |
| 329 | "我们坐出租车去。" | "hsk1-chinese-learning" |
| 330 | "他坐飞机来北京。" | "hsk1-chinese-learning" |
| 331 | "我们在车上说话。" | "hsk1-chinese-learning" |
| 332 | "现在可以走吗？" | "hsk1-chinese-learning" |
| 333 | "喂，你好！" | "hsk1-chinese-learning" |
| 334 | "你现在忙吗？" | "hsk1-chinese-learning" |
| 335 | "请你等一下。" | "hsk1-chinese-learning" |
| 336 | "我们晚上见。" | "hsk1-chinese-learning" |
| 337 | "我是大学生。" | "hsk1-chinese-learning" |
| 338 | "老师在教室里。" | "hsk1-chinese-learning" |
| 339 | "我有一本汉语书。" | "hsk1-chinese-learning" |
| 340 | "请你读这个字。" | "hsk1-chinese-learning" |
| 341 | "我不会写汉字。" | "hsk1-chinese-learning" |
| 342 | "我喜欢看电影。" | "hsk1-chinese-learning" |
| 343 | "他喜欢听音乐。" | "hsk1-chinese-learning" |
| 344 | "这是我的朋友。" | "hsk1-chinese-learning" |
| 345 | "我们都是同学。" | "hsk1-chinese-learning" |
| 346 | "你想一起去吗？" | "hsk1-chinese-learning" |
| 347 | "你今天学了什么？" | "hsk1-chinese-learning" |
| 348 | "我学了很多新词。" | "hsk1-chinese-learning" |
| 349 | "你说得很好。" | "hsk1-chinese-learning" |
| 350 | "我们明天再见。" | "hsk1-chinese-learning" |
| 351 | "加油，你可以！" | "hsk1-chinese-learning" |

### Sentence token not mapped to a word (1)

| surface | pinyin | reason | occurrences |
|---|---|---|---|
| "谁" | "shuí" | "no_pinyin_match" | "2" |

### HSK list item with several possible readings (all kept) (9)

| simplified | readings |
|---|---|
| "差" | ["cha1","cha4","chai1","ci1"] |
| "打" | ["da2","da3"] |
| "地" | ["de5","di4"] |
| "弟" | ["di4","ti4"] |
| "分" | ["fen1","fen4"] |
| "干" | ["gan1","gan4"] |
| "正" | ["zheng1","zheng4"] |
| "中" | ["zhong1","zhong4"] |
| "子" | ["zi3","zi5"] |
