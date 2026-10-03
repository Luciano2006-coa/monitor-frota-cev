from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')
marker = 'id="cevSameUrlMobileBridge"'
if marker in s:
    raise SystemExit(0)

block = '''
<style id="cevSameUrlMobileBridgeStyle">
#cevMobileShell{display:none}
@media (max-width:820px){
  html,body{overscroll-behavior:none}
  #cevMobileShell{display:block;position:fixed;inset:0;width:100%;height:100dvh;border:0;margin:0;padding:0;z-index:2147483000;background:#06111b}
}
</style>
<script id="cevSameUrlMobileBridge">
(function(){
  const mq=window.matchMedia('(max-width:820px)');
  function sync(){
    let f=document.getElementById('cevMobileShell');
    if(mq.matches){
      if(!f){
        f=document.createElement('iframe');
        f.id='cevMobileShell';
        f.title='Monitor CEV Mobile';
        f.src='./monitor-mobile.html?embed=1&v=6';
        f.setAttribute('referrerpolicy','same-origin');
        document.body.appendChild(f);
      }
      document.documentElement.style.overflow='hidden';
      document.body.style.overflow='hidden';
    }else{
      if(f)f.remove();
      document.documentElement.style.overflow='';
      document.body.style.overflow='';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
  if(mq.addEventListener)mq.addEventListener('change',sync);else mq.addListener(sync);
})();
</script>
'''

if '</body>' not in s:
    raise SystemExit('index.html sem </body>')

p.write_text(s.replace('</body>', block + '\n</body>', 1), encoding='utf-8')
