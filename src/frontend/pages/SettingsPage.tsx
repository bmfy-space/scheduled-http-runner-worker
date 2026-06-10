import { ShieldCheck } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="settings-page">
      <section className="settings-band">
        <div>
          <ShieldCheck size={24} />
        </div>
        <dl>
          <div>
            <dt>鉴权</dt>
            <dd>Authorization: Bearer ADMIN_TOKEN</dd>
          </div>
          <div>
            <dt>默认超时</dt>
            <dd>10000 ms，可在任务级覆盖</dd>
          </div>
          <div>
            <dt>日志截断</dt>
            <dd>请求体 2000 字符，响应体 5000 字符</dd>
          </div>
          <div>
            <dt>敏感 Header</dt>
            <dd>Authorization、X-Api-Key、Cookie、Set-Cookie、Proxy-Authorization</dd>
          </div>
          <div>
            <dt>URL 拦截</dt>
            <dd>localhost、loopback、常见私网地址和 link-local 地址</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
