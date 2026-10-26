const db = require('../db');
const bcrypt = require('bcryptjs');

const rawData = `
Achmad Zakky Fanani;0111956420;X - 8;L;0111956420;0111956420;;
Afiqah Liyana Zahira;0118373709;X - 8;P;0118373709;0118373709;;
Alda Maratus Sholiha Anshori;0105704769;X - 8;P;0105704769;0105704769;;
Alzena Zalfa Ramdon;0106666182;X - 8;P;0106666182;0106666182;;
Anisa Ornela Cahya Ningrum;0118610865;X - 8;P;0118610865;0118610865;;
Arlene Trianindya Arshanti;0118518442;X - 8;P;0118518442;0118518442;;
Ata Rayya Andromeda;0101992863;X - 8;L;0101992863;0101992863;;
Aurela Sahara Chinantia;0113989325;X - 8;P;0113989325;0113989325;;
Brandon Julio Alexander;0101558979;X - 8;L;0101558979;0101558979;;
Chanaya Elok Yunanda;0116075224;X - 8;P;0116075224;0116075224;;
Dia Ayu Lintang Kinasih;0109439316;X - 8;P;0109439316;0109439316;;
Erica Uki Windya Putri;0114059786;X - 8;P;0114059786;0114059786;;
Fanny Elshandria Maulifa;0114707603;X - 8;P;0114707603;0114707603;;
Filsah Gama Arrafi;0113991480;X - 8;L;0113991480;0113991480;;
Grace Dindaisa Witra;0107843357;X - 8;P;0107843357;0107843357;;
Imelda Putri Qorirotul Aini;0117662520;X - 8;P;0117662520;0117662520;;
Kanaya Ashyfaluna;0111280800;X - 8;P;0111280800;0111280800;;
Kezia Novyta Restuaprillia;0113668274;X - 8;P;0113668274;0113668274;;
Kornelius Theodorick Wicaksana;0108723759;X - 8;L;0108723759;0108723759;;
Marisha Aulia Putri;3118873428;X - 8;P;3118873428;3118873428;;
Michael Elifellano Tuage;0104490610;X - 8;L;0104490610;0104490610;;
Muhamad Wildan Syahril Adkha;0109594685;X - 8;L;0109594685;0109594685;;
Muhammad Ridho Saputra;0101132761;X - 8;L;0101132761;0101132761;;
Nadia Khalidah Putri Andini;0105994106;X - 8;P;0105994106;0105994106;;
Nathania Abigail Hermawan;0103111392;X - 8;P;0103111392;0103111392;;
Olindea Julie Aufa;0112928199;X - 8;P;0112928199;0112928199;;
Raditya Rajendra Putra Wardhana;0106637277;X - 8;L;0106637277;0106637277;;
Raysah Avisa Azalia Laksono;0106358280;X - 8;P;0106358280;0106358280;;
Rizky Dinar Awaluddin;0107806829;X - 8;L;0107806829;0107806829;;
Sandita Adila Putri Pramono;0118130846;X - 8;P;0118130846;0118130846;;
Sliraku Putra Waluyo Kudu Jejer Satriyo Utomo;0119651308;X - 8;L;0119651308;0119651308;;
Syahlan Nur Ghaffar;0115237049;X - 8;L;0115237049;0115237049;;
Syarifah Aulia Rahmah;0117682765;X - 8;P;0117682765;0117682765;;
Vilovita Noer Eva Sanjaya;0106755135;X - 8;P;0106755135;0106755135;;
Zahra Agnesia Rahmadania;0104210250;X - 8;P;0104210250;0104210250;;
Achmed Izzat Nugraha;0105764039;X - 9;L;0105764039;0105764039;;
Agnes Louis Jessica Oryza Sativa;0103977128;X - 9;P;0103977128;0103977128;;
Alena Saraswati Dynasty Violin;0116328369;X - 9;P;0116328369;0116328369;;
Amalia Kasih;0103929428;X - 9;P;0103929428;0103929428;;
Anditha Mutiara Annisa;0105330859;X - 9;P;0105330859;0105330859;;
Aqilah Putri Cahyanti;0102043016;X - 9;P;0102043016;0102043016;;
Ardiansyah Ramadhan Mahmudi;0107803773;X - 9;L;0107803773;0107803773;;
Athala Rania Insyira;0107399104;X - 9;P;0107399104;0107399104;;
Azzalia Putri Junaedi;0104635318;X - 9;P;0104635318;0104635318;;
Baraka Erza Ahmad Ramadhan;0102963639;X - 9;L;0102963639;0102963639;;
Dahayu Kalinda Labibah;0114287965;X - 9;P;0114287965;0114287965;;
Dito Yuniar;3119429861;X - 9;L;3119429861;3119429861;;
Evan Maalik Ramadhan;0102051427;X - 9;L;0102051427;0102051427;;
Fadhilatul Laila Hasan;0114903317;X - 9;P;0114903317;0114903317;;
Felda Ailin Enrico;0113122224;X - 9;P;0113122224;0113122224;;
Habibah Aulya Putri;0103447693;X - 9;P;0103447693;0103447693;;
Intan Kurnia Sari;0118859576;X - 9;P;0118859576;0118859576;;
Kansa Zahidah Ayunda Bela;0119126169;X - 9;P;0119126169;0119126169;;
Khaizuran Zenas Kurnianindya;0102211479;X - 9;L;0102211479;0102211479;;
Letta Keyla Beiby;0107834349;X - 9;P;0107834349;0107834349;;
Mariska Chandra Kirana;0119011775;X - 9;P;0119011775;0119011775;;
Mikail Gilbrandhyka Yusfiandi;0095258943;X - 9;L;0095258943;0095258943;;
Muhammad Abrisam Shiddiq;0105161449;X - 9;L;0105161449;0105161449;;
Muhammad Sajidan Nafis;0106726012;X - 9;L;0106726012;0106726012;;
Nadine Franda Gultom;0118434610;X - 9;P;0118434610;0118434610;;
Naurah Marchyaaqiilah Nurhasanah;0117747572;X - 9;P;0117747572;0117747572;;
Quinsha Rania Wilhelmina;0109523897;X - 9;P;0109523897;0109523897;;
Renata Alodia Evelinna;0104677240;X - 9;P;0104677240;0104677240;;
Rizqy Surya Keylana;0103572719;X - 9;L;0103572719;0103572719;;
Satria Abdillah Ramadhani Hegia Putra;0105311188;X - 9;L;0105311188;0105311188;;
Shabrina Mutiara Ayu;0107894511;X - 9;P;0107894511;0107894511;;
Sultan Davin Athallah;0103535630;X - 9;L;0103535630;0103535630;;
Syifaur Rahma Az Zahra;0128039822;X - 9;P;0128039822;0128039822;;
Viola Auliani Bensa;0116041289;X - 9;P;0116041289;0116041289;;
Zahra Najwa Saraha;3106052754;X - 9;P;3106052754;3106052754;;
Adabelle Chrysilla Nabigha;0107693882;X - 10;P;0107693882;0107693882;;
Ahmad Shon Haji;0103184595;X - 10;L;0103184595;0103184595;;
Alesha Azzahra;0118129888;X - 10;P;0118129888;0118129888;;
Amanda Ayudya Widagdo;3114357720;X - 10;P;3114357720;3114357720;;
Andy Pratama;0105446071;X - 10;L;0105446071;0105446071;;
Annazuwa Dzahin;0113894808;X - 10;P;0113894808;0113894808;;
Arneyla Zandira Arkananta;0102953181;X - 10;P;0102953181;0102953181;;
Athaya Aqilah Wibowo;0103773211;X - 10;L;0103773211;0103773211;;
Aurilya Ayu Dwi Marsyaningrum;0111766160;X - 10;P;0111766160;0111766160;;
Brigita Fiorenza Janitra;0115463643;X - 10;P;0115463643;0115463643;;
Dalilah Zuema;0102282537;X - 10;P;0102282537;0102282537;;
Dzakiyyah Hasna Kamea;0105100898;X - 10;P;0105100898;0105100898;;
Euro Raftiago Jose;0106597351;X - 10;L;0106597351;0106597351;;
Farannisa Dahayu Helga Afroza;0102146382;X - 10;P;0102146382;0102146382;;
Gabriel Qabila Altafunnisa;0116462831;X - 10;P;0116462831;0116462831;;
Hafiz Muhammad Rizky;0112480032;X - 10;L;0112480032;0112480032;;
Irbah Nazihah El Iffah;0102950863;X - 10;P;0102950863;0102950863;;
Karen Hossyanna Sarosa;0119553629;X - 10;P;0119553629;0119553629;;
Khansa Mutia Anantara;0101790736;X - 10;P;0101790736;0101790736;;
Langit Biru;0091294336;X - 10;L;0091294336;0091294336;;
Mas Alun Annisak;0102274044;X - 10;P;0102274044;0102274044;;
Mikhaila Rizqia Thahar;0117114865;X - 10;P;0117114865;0117114865;;
Mohammad Nafis Thirafi;0112567801;X - 10;L;0112567801;0112567801;;
Muhammad Haikal Rahardian Ezar;0102330526;X - 10;L;0102330526;0102330526;;
Naila Aulia Mukarromah;3110139027;X - 10;P;3110139027;3110139027;;
Nendra Khrisna Alvin Prasetya;0108990657;X - 10;L;0108990657;0108990657;;
Phylia Filadhel Pearlyn Tindaon;0109231418;X - 10;P;0109231418;0109231418;;
Raffasya Kiano Firmana Putra;0122295584;X - 10;L;0122295584;0122295584;;
Restu Sekar Andaru;0101977157;X - 10;P;0101977157;0101977157;;
Roland Yahya;0119123180;X - 10;L;0119123180;0119123180;;
Satria Alamsyah Ramadhan;0102587641;X - 10;L;0102587641;0102587641;;
Shallu Cintya Putri Prasetya;0107710659;X - 10;P;0107710659;0107710659;;
Thalita Pameila Ramandita;0119920084;X - 10;P;0119920084;0119920084;;
Wafi Rifian Bariq;0112191389;X - 10;L;0112191389;0112191389;;
Wulan Ayu Lestari;0102259244;X - 10;P;0102259244;0102259244;;
Adam Cahyana Abidin;0113405715;X - 11;L;0113405715;0113405715;;
Ahza Alisha Zahra Hafiya;0102286507;X - 11;P;0102286507;0102286507;;
Alfarizi Izza Felendra;0111749164;X - 11;L;0111749164;0111749164;;
Aliqa Kirani Atharizqi;0119090776;X - 11;P;0119090776;0119090776;;
Amira Dia Pita Lohka;0109419228;X - 11;P;0109419228;0109419228;;
Aprillia Kusuma Dewanti;0119598668;X - 11;P;0119598668;0119598668;;
Arsa Lencana Wijaya;0103657660;X - 11;L;0103657660;0103657660;;
Ashifa Safitri Haningtyas;0102795605;X - 11;P;0102795605;0102795605;;
Azela Khansa Maha Dwika;0115024573;X - 11;P;0115024573;0115024573;;
Bryan Bhakti Samudra;0117112786;X - 11;L;0117112786;0117112786;;
Cheasya Dwi Putri Sadiva;0101078032;X - 11;P;0101078032;0101078032;;
Diandra Tristania Dwi Wirantika;0101533662;X - 11;P;0101533662;0101533662;;
Evelin Angel Ayta Putri;0101352474;X - 11;P;0101352474;0101352474;;
Faris Maulana;0101457573;X - 11;L;0101457573;0101457573;;
Fenisa Anggun Anasya;0112775539;X - 11;P;0112775539;0112775539;;
Hanifah Az Zahra;0115593969;X - 11;P;0115593969;0115593969;;
Jesica Ayu Oktaviana;0108769512;X - 11;P;0108769512;0108769512;;
Keysha Chairunnisa Al Imam;0119980501;X - 11;P;0119980501;0119980501;;
Levina Aurellia Daniswara;0114145014;X - 11;P;0114145014;0114145014;;
Mas Ayu Prita Maharani;0102308202;X - 11;P;0102308202;0102308202;;
Mochammad Azhar Arasy;0106939209;X - 11;L;0106939209;0106939209;;
Muhammad Adly Putra Hidayat;0104800733;X - 11;L;0104800733;0104800733;;
Muhammad Septian Nur Falah;0101785858;X - 11;L;0101785858;0101785858;;
Nadintya Meyzahra Putri Subandoni;0118753650;X - 11;P;0118753650;0118753650;;
Nayshila Tsania Ramadhani;0103370518;X - 11;P;0103370518;0103370518;;
Prajwalita Lintang Kirana Bastian;0117724211;X - 11;P;0117724211;0117724211;;
Rafif Bintang Adinata;0115414627;X - 11;L;0115414627;0115414627;;
Reyfat Arta Herdiansyah;0118545576;X - 11;L;0118545576;0118545576;;
Rohana Nur Irawati;0113045720;X - 11;P;0113045720;0113045720;;
Roman Arif Nur Riquelme;0103180333;X - 11;L;0103180333;0103180333;;
Sayfhana Nadhifa Dineza;0104775829;X - 11;P;0104775829;0104775829;;
Soraya Arthalia Putri;0109694296;X - 11;P;0109694296;0109694296;;
Tsabita Chaufah Azahna;0101221186;X - 11;P;0101221186;0101221186;;
Tytto Jeryco Putra Pratama;0105168401;X - 11;L;0105168401;0105168401;;
Zaizafun Syawal Kheiritaquin;0109647596;X - 11;P;0109647596;0109647596;;
Addis Azalea Maheswari;0104167555;X - 12;P;0104167555;0104167555;;
Aileen Nadira Arif Chantika;0105362195;X - 12;P;0105362195;0105362195;;
Akbar Kaisar Herman;0105781173;X - 12;L;0105781173;0105781173;;
Amanda Syalima Yasmine;0107056604;X - 12;P;0107056604;0107056604;;
Anelsa Nujma Darmadwipa;0104908620;X - 12;P;0104908620;0104908620;;
Archibald Richardo Awantino;0108978593;X - 12;L;0108978593;0108978593;;
Arthorius Benedixtus Yoedo Soetanto;0115936224;X - 12;L;0115936224;0115936224;;
Askanah Sakhi Quaneisha Zahira;0111759443;X - 12;P;0111759443;0111759443;;
Azkadina Keyzia Nararya Atharayhan;0127017126;X - 12;P;0127017126;0127017126;;
Caesar Devi Permata Sari;0119975072;X - 12;P;0119975072;0119975072;;
Deandra Putra Prasetiyo;0107632415;X - 12;L;0107632415;0107632415;;
Dinda Cintya Cahya Ramadhanti;0115287328;X - 12;P;0115287328;0115287328;;
Fachira Nayfa Mardya Rafeyla;0118616729;X - 12;P;0118616729;0118616729;;
Farra Nur Tsabita;0103686003;X - 12;P;0103686003;0103686003;;
Galih Restu Sadewo;0104981808;X - 12;L;0104981808;0104981808;;
Hanindya Mega Pertiwi;0108611674;X - 12;P;0108611674;0108611674;;
Irva Desta Anggraeni;0108531925;X - 12;P;0108531925;0108531925;;
Kartieka Wulan Keenantie;0116055900;X - 12;P;0116055900;0116055900;;
Khansa Nadia Syifaun Nufus;0108922172;X - 12;P;0108922172;0108922172;;
Lintang Ayu Putri Damares;0102885144;X - 12;P;0102885144;0102885144;;
Lintang Karim Fanshuri;0106263159;X - 12;L;0106263159;0106263159;;
Mohammad Hilmy Al Baihaqi;3108356444;X - 12;L;3108356444;3108356444;;
Muhammad Akhir;0102371794;X - 12;L;0102371794;0102371794;;
Muhammad Yusuf;0104865547;X - 12;L;0104865547;0104865547;;
Nadiny Efia Kumala;0104182131;X - 12;P;0104182131;0104182131;;
Nisvi Tania Sarifatul Hidayah;3107439742;X - 12;P;3107439742;3107439742;;
Prasetyo Vicky Kurniawan;0107075500;X - 12;L;0107075500;0107075500;;
Radiska Putri Bintang Ayu Wicaksono;0109190537;X - 12;P;0109190537;0109190537;;
Reyhan Fito Muhammad Putro;0118027434;X - 12;L;0118027434;0118027434;;
Rohhadatul Aisi;0109783065;X - 12;P;0109783065;0109783065;;
Sazhy Kirana Aryanti;0102810130;X - 12;P;0102810130;0102810130;;
Soraya Lestari;3120694686;X - 12;P;3120694686;3120694686;;
Tsabita Hilary Azaria;0113577909;X - 12;P;0113577909;0113577909;;
Vicko Azam Firmansyah;0102445156;X - 12;L;0102445156;0102445156;;
Zaneta Carissa Putri Sandi;0101412038;X - 12;P;0101412038;0101412038;;
Aira Luna Amalia;0096823837;XI - 5;P;0096823837;0096823837;;
Aisyah Devianita Novarini;0097350128;XI - 5;P;0097350128;0097350128;;
Aluna Chantika Aurily Agatha;0091391702;XI - 5;P;0091391702;0091391702;;
Aluna Kiara Putri;0097437394;XI - 5;P;0097437394;0097437394;;
Alyssa Qotrunnada;0167805073;XI - 5;P;0167805073;0167805073;;
Aqilla Bilqis Putri;3105397321;XI - 5;P;3105397321;3105397321;;
Aurora Verda Nur Athifa;3104986191;XI - 5;P;3104986191;3104986191;;
Bara Akbar Shafiyullah;0099907460;XI - 5;L;0099907460;0099907460;;
David Briandy Pamungkas;0108515585;XI - 5;L;0108515585;0108515585;;
Dominikus Yumai;3094855961;XI - 5;L;3094855961;3094855961;;
Feby Farzana;0102219947;XI - 5;P;0102219947;0102219947;;
Fernadi Satrio Nugroho;0099442029;XI - 5;L;0099442029;0099442029;;
Hening Okta Dewi Prameswari;0098202298;XI - 5;P;0098202298;0098202298;;
Karuna Nathan Nijananda;0092251476;XI - 5;L;0092251476;0092251476;;
Keysha Sadira Kalea;0108713819;XI - 5;P;0108713819;0108713819;;
Mauliddia Ragil Kurnia;0106913144;XI - 5;P;0106913144;0106913144;;
Melani Ade Sevtian;0099710515;XI - 5;P;0099710515;0099710515;;
Mentari Carrolinna Sibarrani;0109839680;XI - 5;P;0109839680;0109839680;;
Moch Maulana Afsel;0105768392;XI - 5;L;0105768392;0105768392;;
Moringgo Febrian;0105657492;XI - 5;L;0105657492;0105657492;;
Muhammad Haykal Almagroby;0096850817;XI - 5;L;0096850817;0096850817;;
Naysifa Aura Firlita;0108137480;XI - 5;P;0108137480;0108137480;;
Nizam Maulana;0102992805;XI - 5;L;0102992805;0102992805;;
Puput Lailatul Afidah;0103829912;XI - 5;P;0103829912;0103829912;;
Qinara Meisya Ayu Swara;0104892240;XI - 5;P;0104892240;0104892240;;
Raditya Kenzie Fahreza;0094327887;XI - 5;L;0094327887;0094327887;;
Shelen Lifiel Chelisya;0107310711;XI - 5;P;0107310711;0107310711;;
Sherina Tiara Ramadhani;0099731593;XI - 5;P;0099731593;0099731593;;
Syavalen Zafiero Agatha;0102714683;XI - 5;P;0102714683;0102714683;;
Tania Kikan Iloh Putri;0095449975;XI - 5;P;0095449975;0095449975;;
Tazkiya Shofiatus Zahro;3103767186;XI - 5;P;3103767186;3103767186;;
Winda Diana Novita;0091599355;XI - 5;P;0091599355;0091599355;;
Yessica Dwi Wulandari;0096505488;XI - 5;P;0096505488;0096505488;;
Yulia Fabikha Nachya Hatta;0104830596;XI - 5;P;0104830596;0104830596;;
Zalla Dimitry Sibarana;0097649935;XI - 5;L;0097649935;0097649935;;
Zetta Navisha Wistara Siregar;3107737332;XI - 5;P;3107737332;3107737332;;
Alief Mahendra Dynasty Viola;0089330950;XII - 7;L;0089330950;0089330950;;
Annisa Putri Rahmadani;0088603229;XII - 7;P;0088603229;0088603229;;
Astrid Putri Irdyantara Mangiwa;0081815965;XII - 7;P;0081815965;0081815965;;
Azzahrah Azka Syahirah;3099814944;XII - 7;P;3099814944;3099814944;;
Bayu Putra Adinata;0081506427;XII - 7;L;0081506427;0081506427;;
Bryans Madha Wahyu P;0092951287;XII - 7;L;0092951287;0092951287;;
Cahyo Rizky Wahyudi;0096208933;XII - 7;L;0096208933;0096208933;;
Calysta Silvia Salsabila;0093670458;XII - 7;P;0093670458;0093670458;;
Davizha Falmay Glady Azziera;0081808715;XII - 7;P;0081808715;0081808715;;
Dewa Aksan;0083821620;XII - 7;L;0083821620;0083821620;;
Enrico Hendy Wijayanto;0095631288;XII - 7;L;0095631288;0095631288;;
Erlangga Safildan Pratama Rochim;0096062466;XII - 7;L;0096062466;0096062466;;
Evonne Airell Devonna;0087014303;XII - 7;L;0087014303;0087014303;;
Febriansyah Widan Pratama;0093159161;XII - 7;L;0093159161;0093159161;;
Ferisya Citra Kharisma;3084659595;XII - 7;P;3084659595;3084659595;;
Hadi Purnomo;0099837852;XII - 7;L;0099837852;0099837852;;
Hafiz Ataya Firqi Ramadhani;0087131695;XII - 7;L;0087131695;0087131695;;
Hasna' Izah Fauqiyah;0096187414;XII - 7;P;0096187414;0096187414;;
Ida Ayu Nadindra Kirana;0087201524;XII - 7;P;0087201524;0087201524;;
Isrofi Maulana Yulianto;0097381029;XII - 7;L;0097381029;0097381029;;
Manha Sanika Zarin;3097180907;XII - 7;P;3097180907;3097180907;;
Mayla Zelda Kirana;0081998100;XII - 7;P;0081998100;0081998100;;
Muhamad Alif Yanfari;0092928330;XII - 7;L;0092928330;0092928330;;
Muhammad Tegar Pribramso;0092745514;XII - 7;L;0092745514;0092745514;;
Natasya Rizkyana Putri Sadiva;0098032718;XII - 7;P;0098032718;0098032718;;
Nindy Walin Febria Rohandi;0097704181;XII - 7;P;0097704181;0097704181;;
Raffi Atha Gagarin;0093407441;XII - 7;L;0093407441;0093407441;;
Rafli Akbar Kuddeh;0079269353;XII - 7;L;0079269353;0079269353;;
Rajaev Wilfi Talib;0093726889;XII - 7;L;0093726889;0093726889;;
Rasendria Zenobi;0094169651;XII - 7;L;0094169651;0094169651;;
Riza Rania Setyoningrum;0092718016;XII - 7;P;0092718016;0092718016;;
Sanitata Fellisha Rahadi;0085516930;XII - 7;P;0085516930;0085516930;;
Septia Bilqis Nurcahyani;0085429692;XII - 7;P;0085429692;0085429692;;
Shandika Dirliansyah;0085235176;XII - 7;L;0085235176;0085235176;;
Shereen Nauliane Yasmine;0098785534;XII - 7;P;0098785534;0098785534;;
Syifaul Qolbi;0105411194;XII - 7;P;0105411194;0105411194;;
Wanda Jamila;0081996245;XII - 7;P;0081996245;0081996245;;
Abdillah Wahhaja Divonegara;3092911008;XII - 8;L;3092911008;3092911008;;
Achmad Dimas Wahyu Harianto;0098500852;XII - 8;L;0098500852;0098500852;;
Ahmad Fani Setiawan;0095934943;XII - 8;L;0095934943;0095934943;;
Akdan Diyastahzar Afandi;0082033995;XII - 8;L;0082033995;0082033995;;
Aldo Valentino Ferdiansyah Hadi;0094674577;XII - 8;L;0094674577;0094674577;;
Alea Cintaku Putri Deasy;0088950227;XII - 8;P;0088950227;0088950227;;
Alvin Edgar Xaverius Cavalera;0081684410;XII - 8;L;0081684410;0081684410;;
Alya Nur Arini;0088192476;XII - 8;P;0088192476;0088192476;;
Amelia Ledy Sekar Ayu;3091381280;XII - 8;P;3091381280;3091381280;;
Andin Dwisabrina Saputri;0086567714;XII - 8;P;0086567714;0086567714;;
Arey Dewangga;0088805404;XII - 8;L;0088805404;0088805404;;
Avryza Fachridho Alansyah;0091083049;XII - 8;L;0091083049;0091083049;;
Barra Zia'ul Haq Solikin;0097841145;XII - 8;L;0097841145;0097841145;;
Bima Azitya Putra;0096942132;XII - 8;L;0096942132;0096942132;;
Cika Amelia Anggraini;0088710569;XII - 8;P;0088710569;0088710569;;
Damar Putra Afrianto;0084556938;XII - 8;P;0084556938;0084556938;;
Delfira Meccayla Madina Nazahra;0089371237;XII - 8;P;0089371237;0089371237;;
Gading Satria Abhirama;0098182727;XII - 8;L;0098182727;0098182727;;
Gevan Rasada Pratista Pratama;0085487102;XII - 8;L;0085487102;0085487102;;
Irsyad Dani Hariyanto;0084551868;XII - 8;L;0084551868;0084551868;;
Ismi Annisa Ayu Setyoningtyas;3092536154;XII - 8;P;3092536154;3092536154;;
Jassons Darenika Poloma;0093956988;XII - 8;L;0093956988;0093956988;;
Jati Alfathan Thariqhidayat;0153339070;XII - 8;L;0153339070;0153339070;;
Kheisya Dina Febika Sari;0097771739;XII - 8;P;0097771739;0097771739;;
Luhur Pambekti Murnianto;0098821465;XII - 8;L;0098821465;0098821465;;
Much Nidhom Regan Arkhananta;0089865114;XII - 8;L;0089865114;0089865114;;
Muhammad Akmal Fadhlan;0096626673;XII - 8;L;0096626673;0096626673;;
Muhammad Fauzi;0084016103;XII - 8;L;0084016103;0084016103;;
Muhammad Zakykanz Nuruddin;0097506788;XII - 8;L;0097506788;0097506788;;
Sarah Mareta Larasati;0086082735;XII - 8;P;0086082735;0086082735;;
Shierley Friska Aishabillah;0098497048;XII - 8;P;0098497048;0098497048;;
Syafira Nur Annisa;0082737519;XII - 8;P;0082737519;0082737519;;
Valentino Al-Ayyubi Hariyanto;0081380455;XII - 8;L;0081380455;0081380455;;
Vicko Noval Pradana;0084501599;XII - 8;L;0084501599;0084501599;;
Zahwa Bulan Aprilia;3094163982;XII - 8;P;3094163982;3094163982;;
Zulfa Zahira Dwi Santika;0085488384;XII - 8;P;0085488384;0085488384;;
`.trim();

function parseAndSeed() {
  const lines = rawData.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('Nama Lengkap'));
  console.log(`Parsing ${lines.length} student records...`);

  // Parse lines
  const parsed = [];
  for (const line of lines) {
    const parts = line.split(';').map(p => p.trim());
    if (parts.length < 4) continue;
    const name = parts[0];
    const nis = parts[1];
    const rawClass = parts[2];
    // Normalize class name: "X - 8" -> "X-8", "XI - 5" -> "XI-5", etc.
    const kelas = rawClass.replace(/\s*-\s*/g, '-');
    const gender = parts[3].toUpperCase() === 'P' ? 'P' : 'L';
    const username = parts[4] || nis;
    const password = parts[5] || nis;
    const email = parts[6] || `${username}@siswa.sekolah.sch.id`;
    const phone = parts[7] || '';

    parsed.push({
      name,
      nis,
      kelas,
      gender,
      username,
      password,
      email,
      phone
    });
  }

  console.log(`Total valid parsed: ${parsed.length}`);

  // Group by class to assign no_absen sequentially (1..N) per class
  const classMap = {};
  for (const st of parsed) {
    if (!classMap[st.kelas]) classMap[st.kelas] = [];
    classMap[st.kelas].push(st);
  }

  // Check / ensure all classes exist in classes table
  const checkClass = db.prepare('SELECT id FROM classes WHERE name = ?');
  const insertClass = db.prepare('INSERT INTO classes (name, level, academic_year) VALUES (?, ?, ?)');

  for (const className of Object.keys(classMap)) {
    const existing = checkClass.get(className);
    if (!existing) {
      let level = 'Kelas 10';
      if (className.startsWith('XI-')) level = 'Kelas 11';
      else if (className.startsWith('XII-')) level = 'Kelas 12';
      insertClass.run(className, level, '2026/2027');
      console.log(`Created missing class: ${className}`);
    }
  }

  // Remove previous demo students
  console.log('Deleting previous demo students...');
  const delResult = db.prepare("DELETE FROM users WHERE role = 'siswa'").run();
  console.log(`Deleted ${delResult.changes} previous demo students.`);

  // Prepare insert statement
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, name, role, nis_nip, kelas, gender, no_absen, email, phone, avatar)
    VALUES (?, ?, ?, 'siswa', ?, ?, ?, ?, ?, ?, ?)
  `);

  let totalInserted = 0;
  const hashCache = {};

  const tx = db.transaction(() => {
    for (const [className, studentList] of Object.entries(classMap)) {
      console.log(`Inserting ${studentList.length} students for class ${className}...`);
      let absenCounter = 1;
      for (const st of studentList) {
        // Hash password (cache hashes for repeated default passwords)
        if (!hashCache[st.password]) {
          hashCache[st.password] = bcrypt.hashSync(st.password, 10);
        }
        const passwordHash = hashCache[st.password];
        const avatar = `https://api.dicebear.com/7.x/micah/svg?seed=${st.username}`;

        insertUser.run(
          st.username,
          passwordHash,
          st.name,
          st.nis,
          st.kelas,
          st.gender,
          absenCounter,
          st.email,
          st.phone,
          avatar
        );
        absenCounter++;
        totalInserted++;
      }
    }
  });

  tx();

  console.log(`Successfully seeded ${totalInserted} real students!`);

  // Report summary per class
  const summary = db.prepare(`
    SELECT kelas, COUNT(*) as count,
           SUM(CASE WHEN gender = 'L' THEN 1 ELSE 0 END) as L,
           SUM(CASE WHEN gender = 'P' THEN 1 ELSE 0 END) as P
    FROM users
    WHERE role = 'siswa'
    GROUP BY kelas
    ORDER BY kelas ASC
  `).all();

  console.log('Student breakdown per class:');
  console.table(summary);
}

if (require.main === module) {
  parseAndSeed();
}

module.exports = { parseAndSeed, rawData };
