import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from './firebase-config.js';
import { initClassTab } from './tab-class.js';
import { initWorkTab } from './tab-work.js';
import { initOfficeTab, officeState, teacherList } from './tab-office.js';
import { initHomeroomTab } from './tab-homeroom.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    
    function switchTab(target) {
        document.getElementById('tabContentClass').classList.add('hidden');
        document.getElementById('tabContentWork').classList.add('hidden');
        document.getElementById('tabContentOffice').classList.add('hidden');
        document.getElementById('tabContentHomeroom').classList.add('hidden');
        
        const btnOff = "nav-tab-btn px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 flex items-center gap-1.5";
        document.getElementById('navTabClass').className = btnOff;
        if(currentUser) { 
            document.getElementById('navTabWork').className = btnOff; 
            document.getElementById('navTabOffice').className = btnOff;
            document.getElementById('navTabHomeroom').className = btnOff;
        }

        const mobOff = "flex-1 py-1.5 text-center text-xs font-medium text-slate-600";
        document.getElementById('mobileNavTabClass').className = mobOff;
        if(currentUser) { 
            document.getElementById('mobileNavTabWork').className = mobOff; 
            document.getElementById('mobileNavTabOffice').className = mobOff;
            document.getElementById('mobileNavTabHomeroom').className = mobOff;
        }

        if (target === 'work' && currentUser) {
            document.getElementById('tabContentWork').classList.remove('hidden');
            document.getElementById('navTabWork').className = "nav-tab-btn active px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-700 shadow-sm flex items-center gap-1.5";
            document.getElementById('mobileNavTabWork').className = "flex-1 py-1.5 text-center text-xs font-bold bg-white text-indigo-700 rounded-lg shadow-sm";
        } else if (target === 'office' && currentUser) {
            document.getElementById('tabContentOffice').
