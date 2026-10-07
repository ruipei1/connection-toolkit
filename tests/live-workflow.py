import urllib.request,urllib.error,http.cookiejar,json,uuid
BASE='http://127.0.0.1:5173';cookie=http.cookiejar.CookieJar();owner=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie));anon=urllib.request.build_opener()
def call(path,method='GET',body=None,client=owner,expected=200,origin=BASE):
 req=urllib.request.Request(BASE+'/api/live/'+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers={'Content-Type':'application/json','Origin':origin})
 try:r=client.open(req)
 except urllib.error.HTTPError as e:r=e
 data=r.read();assert r.status==expected,(path,r.status,data);return json.loads(data) if 'json' in r.headers.get('Content-Type','') else data.decode()
assert call('me',client=anon)['signedIn']==False
call('sessions',client=anon,expected=401)
owner.open(BASE+'/signin-with-chatgpt?return_to=/live.html').read()
assert call('me')['signedIn']
for activity in ['room','invitation']:
 s=call('sessions','POST',{'title':'QA session','activity':activity},expected=201);sid=s['id'];s=call('sessions/'+sid);token=s['participant'];present=s['presentation']
 call('sessions/'+sid,client=anon,expected=401)
 assert set(call('join/'+token,client=anon))=={'title','activity','status'}
 values=[80,40,90,60,70,50,80,40] if activity=='room' else [1,0]
 call('join/'+token,'POST',{'id':str(uuid.uuid4()),'values':values},client=anon,expected=409)
 call('sessions/'+sid,'PATCH',{'action':'open'},origin='https://wrong.example',expected=403)
 call('sessions/'+sid,'PATCH',{'action':'open'})
 call('join/'+token,'POST',{'id':str(uuid.uuid4()),'values':[999]},client=anon,expected=400)
 response_id=str(uuid.uuid4());call('join/'+token,'POST',{'id':response_id,'values':values},client=anon,expected=201)
 call('join/'+token,'POST',{'id':response_id,'values':values},client=anon)
 assert call('sessions/'+sid)['data']['n']==1
 call('sessions/'+sid,'PATCH',{'action':'publish','selected':[0]},expected=409)
 for _ in range(2):call('join/'+token,'POST',{'id':str(uuid.uuid4()),'values':values},client=anon,expected=201)
 call('sessions/'+sid,'PATCH',{'action':'close'})
 s=call('sessions/'+sid);assert s['frozen'] and s['data']['n']==3
 if activity=='room':assert s['data']['pairs'][0]['means']==[80,40]
 else:assert s['data']['cells']==[0,0,3,0]
 call('join/'+token,'POST',{'id':str(uuid.uuid4()),'values':values},client=anon,expected=409)
 assert call('present/'+present,client=anon)['ready']==False
 call('sessions/'+sid,'PATCH',{'action':'publish','selected':[0,2]})
 p=call('present/'+present,client=anon);assert p['ready'] and p['data']['n']==3
 assert 'answers' not in json.dumps(p) and 'owner' not in p
 if activity=='room':assert [x['index'] for x in p['data']['pairs']]==[0,2]
 csv=call('sessions/'+sid+'/csv');assert len(csv.splitlines())==4
 svg=call('sessions/'+sid+'/qr');assert '<svg' in svg
 call('sessions/'+sid+'/csv',client=anon,expected=401)
 call('sessions/'+sid,'PATCH',{'action':'hide'});assert not call('present/'+present,client=anon)['ready']
 call('sessions/'+sid,'PATCH',{'action':'open'});assert not call('sessions/'+sid)['frozen']
 call('sessions/'+sid,'DELETE');call('join/'+token,client=anon,expected=404);call('present/'+present,client=anon,expected=404)
print('PASS: both activity workflows; sign-in boundary; anonymous submission; validation; CSRF; duplicate protection; freeze; selected aggregate presentation; CSV; QR; reopening; deletion.')
