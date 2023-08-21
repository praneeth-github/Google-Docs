import React, { useCallback, useEffect, useState } from 'react'
import Quill from "quill"
import "quill/dist/quill.snow.css"
import { io } from "socket.io-client"
import { useParams } from 'react-router-dom'

import { saveAs } from 'file-saver';
import { pdfExporter } from 'quill-to-pdf';

const fontSizeArr = ['8px','9px','10px','12px','14px','16px','20px','24px','32px','42px','54px','68px','84px','98px'];

var Size = Quill.import('attributors/style/size');
Size.whitelist = fontSizeArr;
Quill.register(Size, true);

const SAVE_INTERVAL_MS = 2000
const toolbarOptions = [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    [{ 'size': fontSizeArr }],
    ['undo', 'redo'],
    ['copy', 'downloadpdf'],
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
    ['blockquote', 'code-block'],
    [{ 'align': [] }],
    [ 'link', 'image', 'video', 'formula' ],
    [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['clean']                                         // remove formatting button
];

export default function TextEditor() {
    const [socket, setSocket] = useState()
    const [quill, setQuill] = useState()
    const {id: documentId} = useParams()
    const [title, setTitle] = useState("Untitled1")

    useEffect(() => {
        const s = io("http://localhost:5000/")
        setSocket(s)

        return () => {
            s.disconnect()
        }
    }, [])

    useEffect(()=>{
        if(socket == null || quill == null) return
        socket.on("load-document", (document) => {
            quill.setContents(document)
            quill.enable()
        })

        socket.emit("get-document", documentId)

        return () => {
            socket.off("load-document")
        }
    }, [socket, quill, documentId])

    useEffect(()=>{
        if(socket == null || quill == null) return

        const interval = setInterval(() => {
            socket.emit("save-document", quill.getContents())
        }, SAVE_INTERVAL_MS);

        return () => {
            clearInterval(interval)
        }
    }, [socket, quill])

    useEffect(() => {
        if(socket == null || quill == null) return

        const handler = (delta, oldDelta, source) => {
            if(source !== "user") return
            socket.emit("send-changes", delta)
        }
        quill.on("text-change", handler)

        return () => {
            quill.off("text-change", handler)
        }
    }, [socket, quill])

    useEffect(() => {
        if(socket == null || quill == null) return

        const handler = (delta) => {
            quill.updateContents(delta)
        }
        socket.on("changes-received", handler)

        return () => {
            socket.off("changes-received", handler)
        }
    }, [socket, quill])

    const wrapperRef = useCallback((wrapper) => {
        if (wrapper == null) return

        wrapper.innerHTML = ""
        const editor = document.createElement("div")
        wrapper.append(editor)

        var icons = Quill.import("ui/icons");
        icons["undo"] = `<svg viewbox="0 0 18 18">
        <polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"></polygon>
        <path class="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"></path>
      </svg>`;
        icons["redo"] = `<svg viewbox="0 0 18 18">
        <polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"></polygon>
        <path class="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"></path>
      </svg>`;
        icons["downloadpdf"] = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-filetype-pdf" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5L14 4.5ZM1.6 11.85H0v3.999h.791v-1.342h.803c.287 0 .531-.057.732-.173.203-.117.358-.275.463-.474a1.42 1.42 0 0 0 .161-.677c0-.25-.053-.476-.158-.677a1.176 1.176 0 0 0-.46-.477c-.2-.12-.443-.179-.732-.179Zm.545 1.333a.795.795 0 0 1-.085.38.574.574 0 0 1-.238.241.794.794 0 0 1-.375.082H.788V12.48h.66c.218 0 .389.06.512.181.123.122.185.296.185.522Zm1.217-1.333v3.999h1.46c.401 0 .734-.08.998-.237a1.45 1.45 0 0 0 .595-.689c.13-.3.196-.662.196-1.084 0-.42-.065-.778-.196-1.075a1.426 1.426 0 0 0-.589-.68c-.264-.156-.599-.234-1.005-.234H3.362Zm.791.645h.563c.248 0 .45.05.609.152a.89.89 0 0 1 .354.454c.079.201.118.452.118.753a2.3 2.3 0 0 1-.068.592 1.14 1.14 0 0 1-.196.422.8.8 0 0 1-.334.252 1.298 1.298 0 0 1-.483.082h-.563v-2.707Zm3.743 1.763v1.591h-.79V11.85h2.548v.653H7.896v1.117h1.606v.638H7.896Z"/>
      </svg>`;
        icons["copy"] = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share-fill" viewBox="0 0 16 16">
        <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/>
      </svg>`;
      
        const q = new Quill(editor, {
            theme: 'snow',
            modules: {
                toolbar: {
                    container: toolbarOptions,
                    handlers: {
                        "undo" : ()=> {
                            handleUndo();
                        },
                        "redo" : () => {
                            handleRedo();
                        },
                        "downloadpdf" : ()=> {
                            handleExportPdf();
                        },
                        "copy" : ()=> {
                            handleCopy();
                        }
                    }

                }
            },
        });
        q.disable()
        q.setText("Loading... Please Wait")
        setQuill(q)

        const handleUndo = 
            () => {
                q.history.undo();
            }

        const handleRedo =
            () => {
                q.history.redo();
            }
        
        const handleExportPdf = 
            async () => {
                const delta = q.getContents();
                const pdfAsBlob = await pdfExporter.generatePdf(delta);
                saveAs(pdfAsBlob, title+'.pdf');
            }
        
        const handleCopy = () =>{
            navigator.clipboard.writeText("http://localhost:3000/documents/"+documentId)
        }

    }, [documentId])

    return (
        <>
        <div className="show" style={{background:"white"}}>
            <img src="/doc.png" height={50} alt="Doc"></img>
            <input
                type="text"
                style={{width:500,
                    height:30,
                    fontSize:20,
                    borderRadius:40,
                    padding:10,
                    border:"true",
                    borderWidth:1,
                    borderColor:"#CECECE",
                }}
                value={title}
                onChange={(e) => {console.log(e.target.value);setTitle(e.target.value)}}
            />
        </div>
        <div className='container' ref={wrapperRef}></div>
        </>
    )
}
