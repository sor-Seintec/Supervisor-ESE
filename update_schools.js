const fs = require('fs');

const userList = `CEEJA NORBERTO SOARES RAMOS - Prof.
ACCÁCIO DE VASCONCELLOS CAMARGO -  Prof.
AGGÊO PEREIRA DO AMARAL - Prof.
ALTAMIR GONÇALVES - Prof.
AMÉLIA CÉSAR MACHADO DE ARAÚJO - Profª.
ANA CECÍLIA MARTINS - Profª.
ANTONIA LUCCHESI - Profª.
ANTONIO CORDEIRO - Prof.
ANTONIO MIGUEL PEREIRA JÚNIOR
ANTONIO PADILHA
ANTONIO VIEIRA CAMPOS
ARQUÍMINIO MARQUES DA SILVA - Prof.
ARTHUR CYRILLO FREIRE - Dr.
BALTAZAR FERNANDES
BEATHRIS CAIXEIRO DEL CISTIA - Profª.
DIÓGENES ALMEIDA MARINS - Prof.
DIONYSIO VIEIRA - Prof.
DULCE ESMERALDA BASILE FERREIRA - Profª.
ELZA SALVESTRO BONILHA - Profª.
ELZIDE CELESTINA SOUZA P. TUNUCHI Profª
ENÉAS PROENÇA DE ARRUDA - Prof.
ESCOLÁSTICA ROSA DE ALMEIDA - Profª.
EZEQUIEL MACHADO NASCIMENTO - Prof.
FERNANDA DE CAMARGO PIRES - Profª 
FLÁVIO GAGLIARDI - Prof.
FRANCISCO CAMARGO CÉSAR
FRANCISCO COCCARO - Prof.
FRANCISCO EUFRÁSIO MONTEIRO
GENÉSIO MACHADO - Prof.
GENÉZIA ISABEL CARDOSO MENCACCI - Profª.
GERALDO DO ESPIRITO S. FOGAÇA ALMEIDA Prof.
GUALBERTO MOREIRA - Dr.
GUIOMAR CAMOLESI SOUZA - Profª.
GUMERCINDO GONÇALVES
HÉLIO DEL CISTIA
HUMBERTO DE CAMPOS
IDA YOLANDA LANZONI DE BARROS - Profª.
ISABEL LOPES MONTEIRO - Profª.
IZABEL RODRIGUES GALVÃO - Profª.
JOÃO CLIMACO DE CAMARGO PIRES
JOÃO MACHADO DE ARAÚJO - Dr.
JOÃO RODRIGUES BUENO
JOÃO SOARES - Monsenhor
JOAQUIM IZIDORO MARINS - Prof.
JORDINA AMARAL ARRUDA - Profª.
JORGE MADUREIRA - Prof.
JOSÉ ODIN DE ARRUDA - Prof.
JOSÉ QUEVEDO - Prof.
JOSÉ REGINATO - Prof.
JOSÉ ROQUE DE ALMEIDA ROSA - Prof.
JÚLIA RIOS ATHAYDE - Profª.
JÚLIO BIERRENBACH LIMA - Prof.
JÚLIO PRESTES DE ALBUQUERQUE - Dr.
LAILA GALEP SACKER - Profª.
LAURO SANCHEZ - Prof.
LUIZ GONZAGA DE CAMARGO FLEURY - Prof.
LUIZ NOGUEIRA MARTINS - Senador
MARCO ANTONIO MENCACCI - Prof.
MARIA CÂNDIDA DE BARROS ARAÚJO - Profª.
MARINA GROHMANN SOARES FERNANDES - Profª.
MARIA HELENA GAZZI BONADIO PROFª
MARIA ONDINA DE ANDRADE Profª
MÁRIO GUILHERME NOTARI
MONTEIRO LOBATO
NAZIRA NAGIB JORGE MURAD RODRIGUES - Profª.
OSSIS SALVESTRINI MENDES - Profª.
OVÍDIO ANTONIO DE SOUZA - Reverendo
PORTO SEGURO - Visconde
RAFAEL ORSI FILHO - Prof.
RENATO SÊNECA DE SÁ FLEURY - Prof.
ROBERTO PASCHOALICK - Prof.
ROQUE CONCEIÇÃO MARTINS - Prof.
ROSEMARY DE MELLO MOREIRA PEREIRA  - Profª.
SARAH SALVESTRO - Profª.
TOBIAS - Brigadeiro
VERGUEIRO - Senador
WALDEMAR DE FREITAS ROSA - Prof.
WANDA COSTA DAHER - Profª.
WILSON RAMOS BRANDÃO - Prof.
ZÉLIA DULCE DE CAMPOS MAIA - Profª.`;

const schools = userList.split('\n').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);

function normalizeName(name) {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
}

const schoolMap = new Map();
schools.forEach(s => {
    let baseName = s.replace(/ - .*$/, '').replace(/ Prof.*$/, '').replace(/ Dr\.$/, '').replace(/ Monsenhor$/, '').replace(/ Reverendo$/, '').replace(/ Visconde$/, '').replace(/ Senador$/, '').replace(/ Brigadeiro$/, '');
    schoolMap.set(normalizeName(baseName), s);
});

// locescola.html
let locescola = fs.readFileSync('locescola.html', 'utf8');
const regex = /const SCHOOL_DATA=(\[\{.*?\}\]);/;
const match = locescola.match(regex);
if (match) {
    const arr = JSON.parse(match[1]);
    const existingNormalized = new Set();
    arr.forEach(item => {
        let n = normalizeName(item.name.replace(/ PROF.?$/, '').replace(/ DR.?$/, '').replace(/^EE /, '').replace(/ MONSENHOR$/, '').replace(/ REVDO$/, '').replace(/ VISCONDE DE$/, ''));
        
        let found = false;
        for (let [norm, target] of schoolMap.entries()) {
            if (n.includes(norm) || norm.includes(n)) {
                item.name = target;
                existingNormalized.add(norm);
                found = true;
                break;
            }
        }
    });

    for (let [norm, target] of schoolMap.entries()) {
        if (!existingNormalized.has(norm)) {
            console.log("Missing school to add: " + target);
            arr.push({
                cie: "",
                name: target,
                types: ["Regular"],
                address: "Não informado",
                phones: [],
                offers: [],
                night: [],
                eja: [],
                professional2025: [],
                professional2026: [],
                officialUrl: "",
                neighborhood: "",
                mapQuery: target + ", Sorocaba - SP, Brasil"
            });
        }
    }
    
    // sort alphabetically
    arr.sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));

    let newJson = JSON.stringify(arr);
    locescola = locescola.replace(regex, 'const SCHOOL_DATA=' + newJson + ';');
    fs.writeFileSync('locescola.html', locescola);
    console.log("Updated locescola.html");
}

// equipeESE.html
let equipeESE = fs.readFileSync('equipeESE.html', 'utf8');
const arrMatch = equipeESE.match(/(\[\{"name":.*?\}\])/);
if (arrMatch) {
    const eqArr = JSON.parse(arrMatch[1]);
    eqArr.forEach(sup => {
        if (sup.stateSchools) {
            sup.stateSchools = sup.stateSchools.map(s => {
                let n = normalizeName(s.replace(/^EE /, '').replace(/ Prof\.? /, '').replace(/ Prof\.?ª /, ''));
                for (let [norm, target] of schoolMap.entries()) {
                    if (n.includes(norm) || norm.includes(n)) {
                        return target;
                    }
                }
                return s;
            });
        }
    });
    let newEqJson = JSON.stringify(eqArr);
    equipeESE = equipeESE.replace(arrMatch[1], newEqJson);
    fs.writeFileSync('equipeESE.html', equipeESE);
    console.log("Updated equipeESE.html");
}
