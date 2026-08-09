import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { bindSettingsPage } from "../src/settings.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function formDouble(submittedValue = "minimal") {
  const controls = new Map(["current", "visual-novel", "minimal"].map(value => [value, {
    value,
    checked: value === submittedValue,
  }]));
  let submitHandler = null;
  return {
    controls,
    querySelector(selector) {
      const value = selector.match(/value="([^"]+)"/)?.[1];
      if (value) return controls.get(value) ?? null;
      if (selector === '[name="ui"]:checked') {
        return [...controls.values()].find(control => control.checked) ?? null;
      }
      return null;
    },
    addEventListener(type, handler) {
      if (type === "submit") submitHandler = handler;
    },
    submit() {
      submitHandler?.({ preventDefault() {} });
    },
  };
}

test("설정 페이지는 세 UI와 하나의 테스트 시작 동작을 제공한다", () => {
  const html = fs.readFileSync(path.join(root, "settings.html"), "utf8");

  assert.match(html, /<form[^>]*data-action="save-ui"/);
  assert.match(html, /name="ui" value="current"/);
  assert.match(html, /name="ui" value="visual-novel"/);
  assert.match(html, /name="ui" value="minimal"/);
  assert.match(html, /선택한 UI로 테스트 시작/);
  assert.match(html, /href="\.\/styles\/settings\.css"/);
  assert.match(html, /src="\.\/src\/settings\.js"/);
  assert.doesNotMatch(html, /\?ui=|compare=1|test=1/);
});

test("설정 페이지는 저장된 UI를 선택 상태로 복원한다", () => {
  const form = formDouble();
  for (const control of form.controls.values()) control.checked = false;

  bindSettingsPage(form, {
    preferenceStore: { load: () => "current", save: value => value },
    locationRef: { href: "settings.html" },
  });

  assert.equal(form.controls.get("current").checked, true);
  assert.equal(form.controls.get("minimal").checked, false);
});

test("설정 저장은 선택값을 기록하고 메인으로 이동한다", () => {
  const saved = [];
  const form = formDouble("minimal");
  const locationRef = { href: "settings.html" };
  bindSettingsPage(form, {
    preferenceStore: {
      load: () => "visual-novel",
      save(value) { saved.push(value); return value; },
    },
    locationRef,
  });
  form.controls.get("visual-novel").checked = false;
  form.controls.get("minimal").checked = true;

  form.submit();

  assert.deepEqual(saved, ["minimal"]);
  assert.equal(locationRef.href, "./");
});
