// netlify/functions/like.js

exports.handler = async (event, context) => {
  console.log('--- Function invoked ---');
  console.log('HTTP Method:', event.httpMethod);

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    console.log('OPTIONS request, returning 200');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    const owner = 'wish2831';
    const repo = 'dianzan';
    const issueId = 1;

    // 2. 获取 Issue
    const getUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueId}`;
    console.log('Fetching issue from:', getUrl);

    const getResponse = await fetch(getUrl, {
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

    // 3. 解析点赞数
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

    // 4. 增加点赞数
    const newCount = currentCount + 1;
    console.log('New count:', newCount);

    // 5. 更新 Issue
    const updateUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueId}`;
    console.log('Updating issue at:', updateUrl);

    const updateResponse = await fetch(updateUrl, {
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ success: true, count: newCount })
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};