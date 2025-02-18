// ==UserScript==
// @name         乘方教务系统学生学分计算工具
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  乘方教务系统的绩点计算工具😆
// @author       GamerNoTitle
// @match        https://jxfw.gdut.edu.cn/*
// @match        https://zhjw.smu.edu.cn/*
// @grant        GM_addStyle
// @run-at       document-idle
// @homepageURL  https://github.com/GDUTMeow/GPACalculator
// @supportURL   https://github.com/GDUTMeow/GPACalculator/issues
// @license      GPLv3
// ==/UserScript==

const CONFIG = {
    VERSION: '1.9',
    REPO_URL: 'https://github.com/GDUTMeow/GPACalculator'
};

(function() {
    'use strict';

    // 原始按钮样式保持不变
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

        /* 完整保留第一次的Material You模态框样式 */
        :root {
            --md-sys-color-primary: #6750A4;
            --md-sys-color-on-primary: #FFFFFF;
            --md-sys-color-surface-container: #F7F2FA;
            --md-sys-color-outline: #79747E;
        }

        .gpa-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            backdrop-filter: blur(4px);
        }

        .gpa-modal {
            background: var(--md-sys-color-surface-container);
            border-radius: 28px;
            padding: 24px;
            width: min(90%, 600px);
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            animation: modalEnter 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes modalEnter {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .modal-title {
            font-size: 22px;
            font-weight: 600;
            color: var(--md-sys-color-primary);
        }

        .modal-close {
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: background 0.2s;
            font-size: 24px;
            line-height: 1;
        }
        .modal-close:hover {
            background: rgba(0,0,0,0.1);
        }

        .modal-content {
            line-height: 1.6;
            font-family: monospace;
            white-space: pre-wrap;
            padding: 12px 0;
            border-top: 1px solid var(--md-sys-color-outline);
            border-bottom: 1px solid var(--md-sys-color-outline);
            margin: 16px 0;
            color: #333;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        }

        .md-button {
            padding: 8px 16px;
            border-radius: 20px;
            border: 1px solid var(--md-sys-color-outline);
            background: transparent;
            cursor: pointer;
            transition: all 0.2s;
            font-family: system-ui;
        }
        .md-button.primary {
            background: var(--md-sys-color-primary);
            color: var(--md-sys-color-on-primary);
            border: none;
        }
        .md-button:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
    `);

    // 保持第一次的模态框创建逻辑
    function createModal(content) {
        const overlay = document.createElement('div');
        overlay.className = 'gpa-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'gpa-modal';

        modal.innerHTML = `
            <div class="modal-header">
                <div class="modal-title">📊 绩点计算结果 | GPACalculator v${CONFIG.VERSION}</div>
                <div class="modal-close">×</div>
            </div>
            <div class="modal-content">${content}</div>
            <div class="modal-actions">
                <button class="md-button" onclick="this.closest('.gpa-modal-overlay').remove()">取消</button>
                <button class="md-button primary" id="confirmCopy">确定复制</button>
            </div>
        `;

        modal.querySelector('.modal-close').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') overlay.remove();
        });

        modal.querySelector('#confirmCopy').addEventListener('click', () => {
            copyToClipboard(CONFIG.REPO_URL);
            overlay.remove();
        });

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }

    // 保持原始按钮注入逻辑
    function injectButton() {
        if (document.getElementById('calcGPA')) return;
        const toolbar = document.getElementById('tb');
        if (!toolbar) return;
        const scoreTable = document.querySelector('table.datagrid-btable');
        if (!scoreTable) return;

        const targetRow = toolbar.querySelector('tr');
        if (!targetRow) return;

        const buttonCell = document.createElement('td');
        buttonCell.style.paddingLeft = '15px';
        buttonCell.style.position = 'relative';
        buttonCell.style.top = '-1px';

        const button = document.createElement('a');
        button.id = 'calcGPA';
        button.innerHTML = '📊 计算绩点';
        button.onclick = calculateGPA;

        buttonCell.appendChild(button);
        targetRow.appendChild(buttonCell);
    }

    // 保持计算逻辑不变
    function calculateGPA() {
        const table = document.querySelector('table.datagrid-btable');
        if (!table) return;

        let totalCredits = 0, weightedSum = 0;
        let totalCreditsWithExemption = 0, weightedSumWithExemption = 0;

        table.querySelectorAll('tr').forEach(row => {
            if (row.querySelector('th')) return;
            const creditCell = row.querySelector('td[field="xf"] div');
            const gradeCell = row.querySelector('td[field="cjjd"] div');
            if (!creditCell || !gradeCell) return;

            const credits = parseFloat(creditCell.textContent.trim());
            const gradeText = gradeCell.textContent.trim();
            const isExempt = gradeText === '免修' || gradeText === '--';

            if (isNaN(credits)) return;

            if (!isExempt) {
                const grade = parseFloat(gradeText);
                if (!isNaN(grade)) {
                    totalCredits += credits;
                    weightedSum += grade * credits;
                }
            }

            const effectiveGrade = isExempt ? 3.0 : parseFloat(gradeText);
            if (!isNaN(effectiveGrade)) {
                totalCreditsWithExemption += credits;
                weightedSumWithExemption += effectiveGrade * credits;
            }
        });

        const resultMessage = [
            `⚠️ 不含免修的是教务系统里面的计算方式`,
            `⚠️ 含免修的是GDUTDays的计算方式`,
            `⚠️ 绩点 = 加权总分 / 总学分`,
            `✨ 点击确定复制GitHub链接 ✨`,
            `📦 ${CONFIG.REPO_URL}`,
            `----------------------------------------------------------`,
            `✅ 总学分(不含免修)：${totalCredits}`,
            `🚩 加权总分(不含免修)：${weightedSum.toFixed(2)}`,
            `🎉 最终绩点(不含免修)：${totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : 0}`,
            `----------------------------------------------------------`,
            `✅ 总学分(含免修)：${totalCreditsWithExemption}`,
            `🚩 加权总分(含免修)：${weightedSumWithExemption.toFixed(2)}`,
            `🎉 最终绩点(含免修)：${totalCreditsWithExemption > 0 ? (weightedSumWithExemption / totalCreditsWithExemption).toFixed(2) : 0}`,
        ].join('\n');

        createModal(resultMessage);
    }

    // 保持其他工具函数
    function copyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }

    // 保持观察器逻辑
    let observer;
    function initObserver() {
        if (observer) observer.disconnect();
        observer = new MutationObserver(injectButton);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 保持路由检测
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            initObserver();
            injectButton();
        }
    }, 1000);

    // 初始化
    if (document.readyState === 'complete') {
        initObserver();
        setTimeout(injectButton, 1500);
    } else {
        window.addEventListener('load', () => {
            initObserver();
            setTimeout(injectButton, 1500);
        });
    }

    window.addEventListener('popstate', () => {
        setTimeout(injectButton, 300);
    });
})();
