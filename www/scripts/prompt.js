function viewW(){
	return document.documentElement.clientWidth;	
}

function viewH(){
	return document.documentElement.clientHeight;	
}

function resizeBg(){
	var oBg = document.getElementById('bg');	
	var oBgImg = oBg.getElementsByTagName('img')[0];		
	
	/*WEB±³¾°*/
	if(!oBg){return false;}
	if(!oBgImg){return false;}
	oBg.style.width = viewW() + 'px';
	oBg.style.height = viewH() + 'px';	
	
	oBgImg.style.width = viewW() + 'px';
	oBgImg.style.height = 'auto';	
	if(oBgImg.offsetHeight>viewH()){
		oBgImg.style.top = -(oBgImg.offsetHeight-viewH())/2 + 'px';	
	}else{
		oBgImg.style.height = viewH() + 'px';
		oBgImg.style.width = 'auto';
		oBgImg.style.left = -(oBgImg.offsetWidth-viewW())/2 + 'px';
	}
	
	var historyMsg = document.getElementById('historyMsg');	
	historyMsg.style.height = viewH() - 192 + 'px';
	
	var videos = document.getElementById('videos');	
	videos.style.width = viewW() - 510 + 'px';
	
}

function generateRandomRoomNumber() {
		$('#room').val(Math.random().toString(36).substr(2));
}

