import type { CSSProperties } from 'react'
import type { ReactNode } from 'react'

type HeaderProps = {
  active?: 'home' | 'quiz' | 'dashboard'
  onQuiz: () => void
  onDashboard: () => void
  onLogout: () => void
}

export function Header({
  active = 'home',
  onQuiz,
  onDashboard,
  onLogout,
}: HeaderProps) {
  return (
    <nav style={styles.nav}>

<div style={styles.navRight}>
  <div style={styles.navTop}>
    <NavItem label="ホーム" active={active === 'home'} icon={<HomeIcon />} />
    <NavItem label="クイズ" active={active === 'quiz'} onClick={onQuiz} icon={<QuizIcon />} />
    <NavItem label="ダッシュボード" active={active === 'dashboard'} onClick={onDashboard} icon={<DashboardIcon />} />
    <NavItem label="プロフィール" icon={<UserIcon />} />
  </div>

  <div style={styles.navBottom}>
    <NavItem label="設定" icon={<SettingsIcon />} />
    <NavItem label="ログアウト" onClick={onLogout} icon={<LogoutIcon />} />
  </div>
</div>
    </nav>
  )
}

function NavItem({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  icon?: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.navItem,
        ...(active ? styles.navItemActive : {}),
      }}
    >
      {icon && <span style={styles.icon}>{icon}</span>}
      {label}
    </button>
  )

}

export function UserIcon() {
  return (
<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.5 0C11.8924 0 13.2277 0.553123 14.2123 1.53769C15.1969 2.52226 15.75 3.85761 15.75 5.25C15.75 6.64239 15.1969 7.97775 14.2123 8.96231C13.2277 9.94688 11.8924 10.5 10.5 10.5C9.10761 10.5 7.77225 9.94688 6.78769 8.96231C5.80312 7.97775 5.25 6.64239 5.25 5.25C5.25 3.85761 5.80312 2.52226 6.78769 1.53769C7.77225 0.553123 9.10761 0 10.5 0ZM10.5 13.125C16.3013 13.125 21 15.4744 21 18.375V21H0V18.375C0 15.4744 4.69875 13.125 10.5 13.125Z" fill="currentColor"/>
</svg>
  );
}
export function HomeIcon(){
  return(
    <svg width="21" height="23" viewBox="0 0 21 23" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0 23V7.66667L10.5 0L21 7.66667V23H13.125V14.0556H7.875V23H0Z" fill="currentColor"/>
</svg>
  )
}

export function QuizIcon(){
  return(
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.3749 13.3224C13.5933 13.1033 13.7025 12.845 13.7025 12.5475C13.7025 12.25 13.5933 11.9921 13.3749 11.7737C13.1565 11.5553 12.8982 11.4457 12.6 11.445C12.3018 11.4443 12.0438 11.5539 11.8261 11.7737C11.6084 11.9935 11.4989 12.2514 11.4975 12.5475C11.4961 12.8436 11.6056 13.1019 11.8261 13.3224C12.0466 13.5429 12.3046 13.6521 12.6 13.65C12.8954 13.6479 13.1537 13.5387 13.3749 13.3224ZM11.8125 10.29H13.3875C13.3875 9.7825 13.44 9.4108 13.545 9.1749C13.65 8.939 13.895 8.6282 14.28 8.2425C14.805 7.7175 15.155 7.2933 15.33 6.9699C15.505 6.6465 15.5925 6.2657 15.5925 5.8275C15.5925 5.04 15.3167 4.39705 14.7651 3.89865C14.2135 3.40025 13.4918 3.1507 12.6 3.15C11.8825 3.15 11.257 3.35125 10.7236 3.75375C10.1902 4.15625 9.8182 4.69 9.6075 5.355L11.025 5.9325C11.1825 5.495 11.397 5.16705 11.6686 4.94865C11.9402 4.73025 12.2507 4.6207 12.6 4.62C13.02 4.62 13.3612 4.7383 13.6237 4.9749C13.8862 5.2115 14.0175 5.5307 14.0175 5.9325C14.0175 6.1775 13.9475 6.40955 13.8075 6.62865C13.6675 6.84775 13.4225 7.1232 13.0725 7.455C12.495 7.9625 12.1408 8.3608 12.0099 8.6499C11.879 8.939 11.8132 9.4857 11.8125 10.29ZM6.3 16.8C5.7225 16.8 5.2283 16.5945 4.8174 16.1836C4.4065 15.7727 4.2007 15.2782 4.2 14.7V2.1C4.2 1.5225 4.4058 1.0283 4.8174 0.6174C5.229 0.2065 5.7232 0.0007 6.3 0H18.9C19.4775 0 19.972 0.2058 20.3836 0.6174C20.7952 1.029 21.0007 1.5232 21 2.1V14.7C21 15.2775 20.7945 15.772 20.3836 16.1836C19.9727 16.5952 19.4782 16.8007 18.9 16.8H6.3ZM2.1 21C1.5225 21 1.0283 20.7945 0.6174 20.3836C0.2065 19.9727 0.0007 19.4782 0 18.9V4.2H2.1V18.9H16.8V21H2.1Z" fill="currentColor"/>
</svg>
  )
}

export function DashboardIcon(){
  return(
    <svg width="21" height="19" viewBox="0 0 21 19" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M14.7 9.26778L19.152 1.53056L20.9685 2.58611L15.477 12.1389L8.6415 8.18056L3.633 16.8889H21V19H0V0H2.1V15.3478L7.875 5.27778L14.7 9.26778Z" fill="currentColor"/>
</svg>

  )
}

export function SettingsIcon(){
  return(
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10.0209 23.8334L9.58755 20.3667C9.35283 20.2765 9.13183 20.1681 8.92455 20.0417C8.71727 19.9154 8.51397 19.7799 8.31463 19.6355L5.09172 20.9897L2.11255 15.8438L4.90213 13.7313C4.88408 13.6049 4.87505 13.4832 4.87505 13.3662V12.635C4.87505 12.5173 4.88408 12.3952 4.90213 12.2688L2.11255 10.1563L5.09172 5.0105L8.31463 6.36466C8.51324 6.22022 8.72088 6.0848 8.93755 5.95841C9.15422 5.83203 9.37088 5.72369 9.58755 5.63341L10.0209 2.16675H15.9792L16.4125 5.63341C16.6473 5.72369 16.8686 5.83203 17.0766 5.95841C17.2846 6.0848 17.4876 6.22022 17.6855 6.36466L20.9084 5.0105L23.8875 10.1563L21.098 12.2688C21.116 12.3952 21.125 12.5173 21.125 12.635V13.3652C21.125 13.4829 21.107 13.6049 21.0709 13.7313L23.8605 15.8438L20.8813 20.9897L17.6855 19.6355C17.4869 19.7799 17.2792 19.9154 17.0625 20.0417C16.8459 20.1681 16.6292 20.2765 16.4125 20.3667L15.9792 23.8334H10.0209ZM13.0542 16.7917C14.1014 16.7917 14.9952 16.4216 15.7355 15.6813C16.4757 14.9411 16.8459 14.0473 16.8459 13.0001C16.8459 11.9529 16.4757 11.0591 15.7355 10.3188C14.9952 9.57855 14.1014 9.20841 13.0542 9.20841C11.9889 9.20841 11.0905 9.57855 10.3589 10.3188C9.62727 11.0591 9.26183 11.9529 9.26255 13.0001C9.26327 14.0473 9.62908 14.9411 10.36 15.6813C11.0909 16.4216 11.9889 16.7917 13.0542 16.7917Z" fill="currentColor"/>
</svg>
  )
}

export function LogoutIcon(){
  return(
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 18C1.45 18 0.979333 17.8043 0.588 17.413C0.196667 17.0217 0.000666667 16.5507 0 16V2C0 1.45 0.196 0.979333 0.588 0.588C0.98 0.196667 1.45067 0.000666667 2 0H9V2H2V16H9V18H2ZM13 14L11.625 12.55L14.175 10H6V8H14.175L11.625 5.45L13 4L18 9L13 14Z" fill="#BFBFBF"/>
</svg>

  )
}

/* styles */
type HeaderStyles = {
  nav: CSSProperties
  navLeft: CSSProperties
  brandCode: CSSProperties
  brandTitle: CSSProperties
  navRight: CSSProperties
  navTop: CSSProperties
  navBottom: CSSProperties
  navItem: CSSProperties
  navItemActive: CSSProperties
  icon: CSSProperties
}

const styles: HeaderStyles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 200,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '24px 16px',
    background: '#ffffff',
    zIndex: 1000,
    borderRight: '1px solid #e9e9e9',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  brandCode: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.08em',
  },
  brandTitle: {
    fontSize: 15,
  },
  navRight: {
    display: 'flex',
    flexDirection: 'column',
    flex:1,
    marginTop: 32,
  },
  navTop: {
    display: 'flex',
    flexDirection: 'column',
  },
  navBottom:{
    display:'flex',
    flexDirection:'column',
  },
  navItem: {
    display:'flex',
    alignItems:'center',
    gap:10,
    background: 'none',
    border: 'none',
    fontSize: 13,
    padding: '20px 12px',
    cursor: 'pointer',
    color: '#666',
    textAlign: 'left',
  },
  navItemActive: {
    color: '#1a1a1a',
    fontWeight: 500,
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}