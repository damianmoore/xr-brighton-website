
var fso = new ActiveXObject( 'Scripting.FileSystemObject' ),
	args = WScript[ 'arguments' ],
	sourcePath = args.length && args.item( 0 );

// function readFile ( path ) {
//	 var ts = fso.getFile( path ).openAsTextStream( 1 ),
//		 content = ts.readAll();
//	 ts.close();
//	 return content;
// }

function readUtfFile ( path ) {
	var stream = new ActiveXObject( "ADODB.Stream" );
	stream.CharSet = "utf-8";
	stream.Open();
	stream.LoadFromFile( path );
	var content = stream.ReadText();
	stream.Close();
	return content;
}

function writeFile ( path, content ) {
	var ts = fso.createTextFile( path, true );
	ts.write( content );
	ts.close();
}

if ( sourcePath ) {
	sourcePath = fso.getAbsolutePathName( sourcePath );
	if ( !fso.fileExists( sourcePath ) ) {
		sourcePath = null;
	}
}

if ( !sourcePath ) {
	WScript.echo( 'ERROR: not found - ' + sourcePath );
	WScript.quit( 1 );
}

var utf = readUtfFile( sourcePath ),
	ascii = utf.replace( /[\u0080-\uffff]/g, function( ch ) {
		return '\\u' + ( '00' + ch.charCodeAt( 0 ).toString( 16 ) ).slice( -4 );
	} ),
	outFilePath = fso.getParentFolderName( fso.getParentFolderName( sourcePath ) )
		+ '\\languages\\'
		+ fso.getFileName( sourcePath );

WScript.echo ( '..\\languages\\' + fso.getFileName( sourcePath ) );
writeFile( outFilePath, ascii );
