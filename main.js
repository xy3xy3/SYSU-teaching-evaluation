var script = document.createElement("script");
script.src = "https://code.jquery.com/jquery-3.6.0.min.js";
script.onload = function () {
  async function getCaptchaImage() {
    try {
      let response = await $.ajax({
        url: "/jwxt/evaluation-manage/verifyCode?",
        method: "GET",
        xhrFields: {
          responseType: "blob", // 将响应数据类型设置为blob
        },
      });

      let reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onloadend = function () {
          let base64data = reader.result.split(",")[1]; // 获取Base64编码的字符串
          resolve(base64data);
        };
        reader.onerror = function (error) {
          reject(error);
        };
        reader.readAsDataURL(response);
      });
    } catch (error) {
      console.error("Error fetching captcha image: " + error);
    }
  }

  async function getCaptcha(base64Image) {
    try {
      let response = await $.ajax({
        url: "http://127.0.0.1:6688/api/ocr/image",
        method: "POST",
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({ img_base64: base64Image }),
      });

      return response.result;
    } catch (error) {
      console.error("Error fetching captcha image: " + error);
    }
  }
  async function addBatch(data, code = "") {
    try {
      let res = await $.ajax({
        url:
          "https://jwxt.sysu.edu.cn/jwxt/evaluation-manage/evaluationResult/addBatch?verifyCode=" +
          code +
          "&_=" +
          new Date().getTime(),
        method: "POST",
        contentType: "application/json;charset=UTF-8",
        data: data,
      });

      if (res.code == 200) {
        return res;
      } else {
        console.error("评教课程失败" + res.message);
        if (res.message == "请输入验证码") {
          let base64Image = await getCaptchaImage();
          let captchaNumber = await getCaptcha(base64Image);
          await addBatch(data, captchaNumber);
        }
      }
    } catch (error) {
      if (error.responseJSON) {
        let res = error.responseJSON;
        console.error("Error: " + res.message);
        if (res.message == "请输入验证码") {
          let base64Image = await getCaptchaImage();
          let captchaNumber = await getCaptcha(base64Image);
          return await addBatch(data, captchaNumber);
        }
      } else {
        console.error("Error: " + error);
      }
    }
  }
  async function getEvalDetail(acadYear, way, type) {
    try {
      let res = await $.ajax({
        url: "https://jwxt.sysu.edu.cn/jwxt/evaluation-manage/evaluationNormInformation/getEvalDetail",
        method: "GET",
        contentType: "application/json;charset=UTF-8",
        data: {
          acadYear: acadYear,
          way: way,
          type: type,
        },
      });

      if (res.code == 200) {
        return res.data;
      } else {
        console.error("获取评教课程失败" + res.message);
      }
    } catch (error) {
      console.error("Error: " + error);
    }
  }

  async function fetchTeachers() {
    try {
      let response = await $.ajax({
        url: "https://jwxt.sysu.edu.cn/jwxt/evaluation-manage/evaluationMission/queryStuEvalMission",
        method: "POST",
        contentType: "application/json;charset=UTF-8",
        data: JSON.stringify({
          pageNo: 1,
          pageSize: 12,
          total: true,
          param: {},
        }),
      });

      if (response.code == 200) {
        if (response.data.total == 0) {
          console.log("没有需要评教的课程");
          return;
        }
        return response.data.rows;
      } else {
        console.error("获取评教课程失败" + response.message);
      }
    } catch (error) {
      console.error("Error: " + error);
    }
  }
  // jQuery加载完成后执行Ajax请求
  $(document).ready(async function () {
    //获取所有需要评教的课程
    let teachers = await fetchTeachers();
    //遍历所有需要评教的课程
    for (let i = 0; i < teachers.length; i++) {
      let teacher = teachers[i];
      let details = await getEvalDetail(
        (acadYear = teacher.acadYear),
        (way = teacher.evaluationWayCode),
        (type = teacher.evallndexTypeCode)
      );
      console.log("开始评教：" + teacher.courseName + " " + teacher.teacher);
      let data = [];
      for (let j = 0; j < details[1].length; j++) {
        let detail = details[1][j];
        obj = {
          evaluationRelationID: teacher.id,
          evaluationNormMessageID: detail.id,
          questionCode: "1",
          levelName: detail.secondIndex,
          fullCredit: detail.fullScore,
          grade: detail.fullScore,
        };
        data.push(obj);
      }
      for (let j = 0; j < details[2].length; j++) {
        let detail = details[2][j];
        obj = {
          evaluationRelationID: teacher.id,
          evaluationNormMessageID: detail.id,
          questionCode: "2",
          levelName: detail.secondIndex,
          fullCredit: detail.fullScore,
          grade: detail.fullScore,
          openQuestionAnswers: null,
        };
        data.push(obj);
      }
      let dataStr = JSON.stringify(data);
      //json字符串
      console.log("评教数据：" + dataStr);
      let res = await addBatch(dataStr);
      console.log(res);
    }
  });
};
document.head.appendChild(script);
