export default function GetLogoByProjectName(name: string): string {
    return '/logos/' + name.toLowerCase() + '.png';
}