// ==UserScript==
// @name         乘方教务系统学生学分计算工具
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  窝工的教务系统的绩点计算工具😆
// @author       GamerNoTitle
// @match        https://jxfw.gdut.edu.cn/*
// @match        https://zhjw.smu.edu.cn/*
// @grant        GM_addStyle
// @run-at       document-idle
// @homepageURL  https://github.com/GDUTMeow/GPACalculator
// @supportURL   https://github.com/GDUTMeow/GPACalculator/issues
// @license      GPLv3
// ==/UserScript==

// 如果这里没有你的教务系统，请自己添加匹配规则
// 格式按照 @match https://<教务系统域名>/* 填写

/* 功能特性
✅ 自动注入计算按钮
✅ 支持免修课程计算（按3.0绩点）
✅ 实时监控页面变化
✅ 适配SPA路由跳转
✅ 双模式计算结果展示

📌 使用说明
1. 访问教务系统成绩页面
2. 点击工具栏的"📊 计算绩点"按钮
3. 查看弹窗中的详细计算结果
*/

(function() {
    'use strict';

    // 按钮自定义样式
    GM_addStyle(`
        #calcGPA {
            margin-left: 12px;
            padding: 2px 8px;
            background: #5bc0de;
            color: white;
            border: 1px solid #46b8da;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
            vertical-align: middle;
            transition: all 0.3s;
        }
        #calcGPA:hover {
            background: #31b0d5;
            transform: translateY(-1px);
        }
        #calcGPA:active {
            transform: translateY(0);
        }
    `);

    // 核心注入函数
    function injectButton() {
        // 如果按钮已存在则终止
        if (document.getElementById('calcGPA')) return;

        // 查找目标容器
        const toolbar = document.getElementById('tb');
        if (!toolbar) return;

        // 验证是否在成绩页面
        const scoreTable = document.querySelector('table.datagrid-btable');
        if (!scoreTable) return;

        // 定位插入点
        const targetRow = toolbar.querySelector('tr');
        if (!targetRow) return;

        // 创建容器TD
        const buttonCell = document.createElement('td');
        buttonCell.style.paddingLeft = '15px';
        buttonCell.style.position = 'relative';
        buttonCell.style.top = '-1px'; // 微调垂直对齐

        // 创建按钮
        const button = document.createElement('a');
        button.id = 'calcGPA';
        button.innerHTML = '📊 计算绩点';
        button.onclick = calculateGPA;

        // 组装元素
        buttonCell.appendChild(button);
        targetRow.appendChild(buttonCell);

        console.log('[成功] 绩点按钮已注入');
    }

    // 绩点计算函数
    function calculateGPA() {
        const table = document.querySelector('table.datagrid-btable');
        if (!table) {
            alert('错误：未找到成绩表格');
            return;
        }

        let totalCredits = 0;
        let weightedSum = 0;
        let totalCreditsWithExemption = 0;
        let weightedSumWithExemption = 0;

        table.querySelectorAll('tr').forEach(row => {
            if (row.querySelector('th')) return;

            const creditCell = row.querySelector('td[field="xf"] div');
            const gradeCell = row.querySelector('td[field="cjjd"] div');
            if (!creditCell || !gradeCell) return;

            const credits = parseFloat(creditCell.textContent.trim());
            const gradeText = gradeCell.textContent.trim();
            const isExempt = gradeText === '免修' || gradeText === '--';

            if (isNaN(credits)) return;

            // 排除免修计算
            if (!isExempt) {
                const grade = parseFloat(gradeText);
                if (!isNaN(grade)) {
                    totalCredits += credits;
                    weightedSum += grade * credits;
                }
            }

            // 包含免修的计算
            const effectiveGrade = isExempt ? 3.0 : parseFloat(gradeText);
            if (!isNaN(effectiveGrade)) {
                totalCreditsWithExemption += credits;
                weightedSumWithExemption += effectiveGrade * credits;
            }
        });

        // 构建结果消息
        const resultMessage = [
            `=========== 学分计算小工具 ============`,
            `⚠️ 不含免修的是教务系统里面的计算方式`,
            `⚠️ 含免修的是GDUTDays的计算方式`,
            `⚠️ 绩点 = 加权总分 / 总学分`,
            `✨ 点击确定复制GitHub链接 ✨`,
            `📦 https://github.com/GDUTMeow/GPACalculator`,
            `----------------------------------------------------------`,
            `✅ 总学分(不含免修)：${totalCredits}`,
            `🚩 加权总分(不含免修)：${weightedSum.toFixed(2)}`,
            `🎉 最终绩点(不含免修)：${totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : 0}`,
            `----------------------------------------------------------`,
            `✅ 总学分(含免修)：${totalCreditsWithExemption}`,
            `🚩 加权总分(含免修)：${weightedSumWithExemption.toFixed(2)}`,
            `🎉 最终绩点(含免修)：${totalCreditsWithExemption > 0 ? (weightedSumWithExemption / totalCreditsWithExemption).toFixed(2) : 0}`,
            `=============== v1.8 ================`
        ].join('\n');

        // 显示确认对话框并处理结果
        if (confirm(resultMessage)) {
            copyToClipboard('https://github.com/GDUTMeow/GPACalculator');
        }
    }

    // 剪贴板操作函数
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            console.log('链接已复制到剪贴板');
        } catch (err) {
            console.error('无法复制内容:', err);
            prompt('请手动复制以下链接：', text);
        } finally {
            document.body.removeChild(textarea);
        }
    }


    // 智能检测系统
    let observer;
    function initObserver() {
        // 如果已有观察器则重置
        if (observer) observer.disconnect();

        // 创建新的观察器
        observer = new MutationObserver(mutations => {
            injectButton();
        });

        // 配置观察选项
        const config = {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        };

        // 开始观察body变化
        if (document.body) {
            observer.observe(document.body, config);
            console.log('[系统] 启动DOM观察器');
        }
    }

    // URL变化检测
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('[系统] 检测到URL变化，重新初始化');
            initObserver();
            injectButton();
        }
    }, 1000);

    // 页面加载处理
    if (document.readyState === 'complete') {
        initObserver();
        setTimeout(injectButton, 1500); // 延迟注入
    } else {
        window.addEventListener('load', () => {
            initObserver();
            setTimeout(injectButton, 1500);
        });
    }

    // 兼容SPA路由
    window.addEventListener('popstate', () => {
        setTimeout(injectButton, 300);
    });
})();