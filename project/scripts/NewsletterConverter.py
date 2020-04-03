#!/usr/bin/python

import sys, getopt, re

def main(argv):
    inputfile = ''
    outputfile = ''
    try:
        opts, args = getopt.getopt(argv,"hi:o:",["ifile=","ofile="])
    except getopt.GetoptError:
        sys.exit(2)
    for opt, arg in opts:
        if opt in ("-i", "--ifile"):
            inputfile = arg
        elif opt in ("-o", "--ofile"):
            outputfile = arg
    if outputfile == '':
        outputfile = 'FormattedNewsletter.html';
    writeHTML(outputfile, readFile(inputfile));

def readFile(path):
    output = ''
    with open(path, 'r', encoding="utf8") as f:
        for line in f.readlines():
            output = output + convertTXT(line);
        f.close()
    return output
    
def writeHTML(path, content):
    file = open(path,'w')
    file.write(content)
    file.close()

def convertTXT(content):
    #bold start
    content = re.sub('\*\*', '<b>', content)
    #bold end 
    content = re.sub('/\*', '</b>', content)
    #horizontal row
    content = re.sub('^[_]{2}', '<hr>', content)
    #emphasis start
    content = re.sub('[-]{2}', '<em>', content)
    #emphasis end
    content = re.sub('/[-]', '</em>', content)
    #h3 end
    content = re.sub('/[#]{3}', '</h3>', content)
    #h3 start
    content = re.sub('^#{3}', '<h3>', content)
    #h2 end
    content = re.sub('/[#]{2}', '</h2>', content)
    #h2 start
    content = re.sub('^#{2}', '<h2>', content)
    #h1 end
    content = re.sub('/#', '</h1>', content)
    #h1 start
    content = re.sub('^#', '<h1>', content)
    #line breaks
    content = re.sub('\s{2}$', '</br>', content)
    #blank line
    content = re.sub('^\s*$','<p></p>', content)
    return content

if __name__ == "__main__":
   main(sys.argv[1:])