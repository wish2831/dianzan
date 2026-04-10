// netlify/functions/like.js
// 整合版：支持 GET（查询）和 POST（点赞），保留详细日志

exports.handler = async (event, context) => {
  console.log('--- Function invoked ---');
  console.log('HTTP Method:', event.httpMethod);

  // 处理预检请求（CORS）
  if (event.httpMethod === 'OPTIONS') {
    console.log('OPTIONS request, returning 200');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: ''
    };
  }

  try {
    // 1. 检查环境变量
    const token = process.env.GITHUB_TOKEN;
    console.log('GITHUB_TOKEN exists:', !!token);
    if (!token) {
      throw new Error('Missing GITHUB_TOKEN environment variable');
    }

    // 仓库配置（使用你原来的）
    const owner = 'wish2831';
    const repo = 'dianzan';
    const issueId = 1;

    // 2. 获取 Issue 的 URL
    const issueUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueId}`;
    console.log('Fetching issue from:', issueUrl);

    // 3. 获取当前 Issue 内容（无论 GET 还是 POST 都需要）
    const getResponse = await fetch(issueUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    console.log('GET response status:', getResponse.status);
    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Failed to get issue: ${getResponse.status} - ${errorText}`);
    }

    const issue = await getResponse.json();
    console.log('Issue fetched successfully');

    // 4. 解析当前点赞数
    const content = issue.body || '';
    console.log('Issue body:', content.substring(0, 100) + '...');

    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
    const jsonContent = jsonMatch ? jsonMatch[1] : content;
    let currentCount = 0;

    try {
      const data = JSON.parse(jsonContent);
      currentCount = data.count || 0;
    } catch (parseError) {
      console.error('Failed to parse JSON, using 0');
    }
    console.log('Current count:', currentCount);

    // 5. 根据请求方法处理
    if (event.httpMethod === 'POST') {
      // POST：增加点赞数
      const newCount = currentCount + 1;
      console.log('New count (POST):', newCount);

      // 更新 Issue
      const updateResponse = await fetch(issueUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: `\`\`\`json\n{"count": ${newCount}}\n\`\`\``
        })
      });

      console.log('PATCH response status:', updateResponse.status);
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        throw new Error(`Failed to update issue: ${updateResponse.status} - ${errorText}`);
      }

      console.log('Issue updated successfully');
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        },
        body: JSON.stringify({ success: true, count: newCount })
      };
    }

    // GET：只返回当前点赞数，不修改
    console.log('GET request, returning current count without modification');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({ success: true, count: currentCount })
    };

  } catch (error) {
    console.error('!!! ERROR in function !!!');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);

    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
