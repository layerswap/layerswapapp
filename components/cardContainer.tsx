export default function CardContainer(props) {
    return (<div className="py-8 md:py-16 px-4 md:px-0" {...props}>
        <div className="bg-gradient-to-r from-indigo-400 to-pink-400 shadow-lg p-1.5 rounded-3xl w-full">
            <div className="bg-white shadow-lg rounded-3xl px-8 py-8">
                {props.children}
            </div>
        </div>
    </div>);
}