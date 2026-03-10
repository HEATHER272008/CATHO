// ONLY STYLE / DESIGN IMPROVEMENTS
// LOGIC NOT MODIFIED

import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { CrossLogo } from '@/components/CrossLogo'
import { useAuth } from '@/hooks/useAuth'
import { Moon, Sun, LogOut, QrCode, Calendar, User, Star, Home, HelpCircle, BarChart3, WifiOff } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import TutorialGuide, { useTutorial } from '@/components/TutorialGuide'
import NoticeModal from '@/components/NoticeModal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import DigitalClock from '@/components/DigitalClock'
import SettingsDialog from '@/components/SettingsDialog'
import { useTranslation } from '@/hooks/useTranslation'

const StudentDashboard = () => {

const navigate = useNavigate()
const location = useLocation()
const { user, profile, signOut } = useAuth()
const { t } = useTranslation()

const [showQuote,setShowQuote] = useState(false)

const { showTutorial, openTutorial, closeTutorial } = useTutorial()

const [showNotice,setShowNotice] = useState(false)

useEffect(()=>{
const seen = sessionStorage.getItem('catholink_notice_shown')
if(!seen){
setTimeout(()=>{
setShowNotice(true)
sessionStorage.setItem('catholink_notice_shown','true')
},1000)
}
},[])

const handleSignOut = async ()=>{
await signOut()
navigate('/auth')
}

const menuItems = [

{
icon:QrCode,
label:t('menu.qr_code'),
description:t('menu.qr_code_desc'),
path:'/student/qr-code',
color:'bg-primary/10 text-primary'
},

{
icon:Calendar,
label:t('menu.attendance'),
description:t('menu.attendance_desc'),
path:'/student/attendance',
color:'bg-green-500/10 text-green-600'
},

{
icon:BarChart3,
label:t('menu.summary'),
description:t('menu.summary_desc'),
path:'/student/attendance-summary',
color:'bg-indigo-500/10 text-indigo-600'
},

{
icon:WifiOff,
label:t('menu.offline_qr'),
description:t('menu.offline_qr_desc'),
path:'/student/offline-qr',
color:'bg-amber-500/10 text-amber-600'
},

{
icon:User,
label:t('menu.profile'),
description:t('menu.profile_desc'),
path:'/student/profile',
color:'bg-blue-500/10 text-blue-600'
},

{
icon:Star,
label:t('menu.rate_app'),
description:t('menu.rate_app_desc'),
path:'/ratings',
color:'bg-yellow-500/10 text-yellow-600'
},

]

const bottomNavItems = [

{ icon:Home,label:t('nav.home'),path:'/dashboard'},
{ icon:QrCode,label:t('nav.qr_code'),path:'/student/qr-code'},
{ icon:Calendar,label:t('nav.attendance'),path:'/student/attendance'},
{ icon:User,label:t('nav.profile'),path:'/student/profile'}

]

if(!profile){
return(
<div className="min-h-screen flex items-center justify-center">
<CrossLogo size={120}/>
</div>
)
}

const getInitials=(name:string)=>{
return name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
}

return(

<div className="min-h-screen bg-background flex flex-col">

<TutorialGuide isOpen={showTutorial} onClose={closeTutorial}/>
<NoticeModal isOpen={showNotice} onClose={()=>setShowNotice(false)}/>

{/* HEADER */}

<header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">

<div className="flex items-center justify-between px-5 py-3">

<div className="flex items-center gap-3">

<CrossLogo size={38}/>

<div>

<h1 className="font-bold text-lg text-primary">
CathoLink
</h1>

<p className="text-xs text-muted-foreground">
{t('app.student_portal')}
</p>

</div>

</div>

<div className="flex items-center gap-2">

<DigitalClock/>

<SettingsDialog/>

<Button
variant="ghost"
size="icon"
onClick={openTutorial}
className="h-9 w-9"
>
<HelpCircle className="h-4 w-4"/>
</Button>

<Button
variant="ghost"
size="icon"
onClick={handleSignOut}
className="h-9 w-9"
>
<LogOut className="h-4 w-4"/>
</Button>

</div>

</div>

</header>

{/* MAIN */}

<main className="flex-1 px-5 py-6 pb-24">

{/* WELCOME CARD */}

<div className="mb-7 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border shadow-sm p-6">

<div className="flex items-center gap-4">

<Avatar className="h-16 w-16 border">

<AvatarImage src={profile.profile_picture_url || undefined}/>

<AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">

{getInitials(profile.name)}

</AvatarFallback>

</Avatar>

<div>

<p className="text-sm text-muted-foreground">
{t('dashboard.welcome')}
</p>

<h2 className="text-xl font-bold">
{profile.name}
</h2>

<p className="text-sm text-muted-foreground">
Section: {profile.section}
</p>

</div>

</div>

</div>

{/* TITLE */}

<div className="mb-5">

<h3 className="text-lg font-semibold">
{t('dashboard.quick_actions')}
</h3>

<p className="text-sm text-muted-foreground">
{t('dashboard.what_to_do')}
</p>

</div>

{/* GRID */}

<div className="grid grid-cols-2 gap-5">

{menuItems.map((item,index)=>(

<button

key={item.path}

onClick={()=>navigate(item.path)}

className="group bg-card border rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"

>

<div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${item.color} group-hover:scale-110 transition`}>

<item.icon className="h-6 w-6"/>

</div>

<span className="font-medium text-sm">
{item.label}
</span>

<span className="text-xs text-muted-foreground mt-1">
{item.description}
</span>

</button>

))}

</div>

{/* FOOTER TEXT */}

<div className="text-center mt-10">

<p className="text-xs text-muted-foreground">
{t('app.tagline')}
</p>

</div>

</main>

{/* BOTTOM NAV */}

<nav className="fixed bottom-0 left-0 right-0 border-t bg-background/90 backdrop-blur">

<div className="flex justify-around py-2">

{bottomNavItems.map(item=>{

const active = location.pathname===item.path

return(

<button

key={item.path}

onClick={()=>navigate(item.path)}

className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all

${active

? 'text-primary bg-primary/10 scale-105'

: 'text-muted-foreground hover:text-foreground'}

`}

>

<item.icon className="h-5 w-5"/>

<span className="text-xs mt-1">
{item.label}
</span>

</button>

)

})}

</div>

</nav>

</div>

)

}

export default StudentDashboard