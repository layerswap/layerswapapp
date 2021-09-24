export default function CardContainer({ children }) {
    return (<div className="min-h-screen flex flex-col justify-start py-32">
        <div className="mx-auto">
            <div className="bg-gradient-to-r from-indigo-400 to-pink-400 shadow-lg p-3 rounded-3xl">
                <div className="bg-white shadow-lg rounded-3xl px-14 py-10">
                    {children}
                </div>
            </div>
        </div>
    </div>);
}